package com.livemart.product.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket 실시간 재고 알림 — Redis Pub/Sub 기반 다중 인스턴스 지원
 *
 * 아키텍처:
 *   Producer: broadcastStockUpdate() → Redis PUBLISH stock:updates
 *   Consumer: handleStockUpdate()    ← Redis SUBSCRIBE (RedisConfig 등록)
 *             → 로컬 WS 세션에 전송
 *
 * 효과: 50k 동시 접속 시 모든 인스턴스의 WebSocket 클라이언트에 재고 변경 전달 가능
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class StockWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate stringRedisTemplate;

    public static final String STOCK_UPDATE_CHANNEL  = "stock:updates";
    public static final String LOW_STOCK_CHANNEL     = "stock:low-alerts";

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        log.info("WebSocket connected: sessionId={}, total={}", session.getId(), sessions.size());
        session.sendMessage(new TextMessage(
            "{\"type\":\"connected\",\"message\":\"Real-time stock updates enabled\"}"
        ));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
        if ("subscribe".equals(payload.get("action"))) {
            Long productId = ((Number) payload.get("productId")).longValue();
            session.getAttributes().put("subscribedProductId", productId);
            session.sendMessage(new TextMessage(
                String.format("{\"type\":\"subscribed\",\"productId\":%d}", productId)
            ));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        log.info("WebSocket disconnected: sessionId={}, status={}, remaining={}", session.getId(), status, sessions.size());
    }

    /**
     * Redis Pub/Sub을 통해 모든 인스턴스에 재고 업데이트 발행
     * → 이 서버 + 다른 모든 서버 인스턴스의 WebSocket 세션에 전달됨
     */
    public void broadcastStockUpdate(Long productId, Integer newStock) {
        String message = String.format(
            "{\"type\":\"stockUpdate\",\"productId\":%d,\"stock\":%d,\"timestamp\":%d}",
            productId, newStock, System.currentTimeMillis()
        );
        stringRedisTemplate.convertAndSend(STOCK_UPDATE_CHANNEL, message);
        log.debug("Stock update published to Redis Pub/Sub: productId={}, stock={}", productId, newStock);
    }

    /**
     * Redis Pub/Sub을 통해 재고 부족 경고 발행
     */
    public void sendLowStockAlert(Long productId, Integer stock, Integer threshold) {
        String message = String.format(
            "{\"type\":\"lowStockAlert\",\"productId\":%d,\"stock\":%d,\"threshold\":%d}",
            productId, stock, threshold
        );
        stringRedisTemplate.convertAndSend(LOW_STOCK_CHANNEL, message);
        log.info("Low stock alert published: productId={}, stock={}/{}", productId, stock, threshold);
    }

    // ── Redis Subscriber callbacks (RedisConfig에서 MessageListenerAdapter로 등록) ──────

    /**
     * stock:updates 채널 수신 → 해당 상품을 구독한 로컬 WebSocket 세션에 전달
     */
    public void handleStockUpdate(String message) {
        try {
            Map<String, Object> payload = objectMapper.readValue(message, Map.class);
            Long productId = ((Number) payload.get("productId")).longValue();

            sessions.values().forEach(session -> {
                try {
                    Long subscribedId = (Long) session.getAttributes().get("subscribedProductId");
                    if (subscribedId != null && subscribedId.equals(productId) && session.isOpen()) {
                        session.sendMessage(new TextMessage(message));
                    }
                } catch (Exception e) {
                    log.error("Failed to send stock update to session {}: {}", session.getId(), e.getMessage());
                }
            });
        } catch (Exception e) {
            log.error("Failed to parse stock update from Redis: {}", message, e);
        }
    }

    /**
     * stock:low-alerts 채널 수신 → 모든 로컬 WebSocket 세션에 전달
     */
    public void handleLowStockAlert(String message) {
        sessions.values().forEach(session -> {
            try {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(message));
                }
            } catch (Exception e) {
                log.error("Failed to send low stock alert to session {}: {}", session.getId(), e.getMessage());
            }
        });
    }
}
