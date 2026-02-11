package com.livemart.product.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket을 통한 실시간 재고 알림
 * 현대적인 실시간 통신 구현
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class StockWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        log.info("WebSocket connected: sessionId={}", session.getId());

        // 연결 확인 메시지
        session.sendMessage(new TextMessage("{\"type\":\"connected\",\"message\":\"Real-time stock updates enabled\"}"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        log.info("Received message: sessionId={}, payload={}", session.getId(), message.getPayload());

        // 클라이언트가 특정 상품 구독 요청
        Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);

        if ("subscribe".equals(payload.get("action"))) {
            Long productId = ((Number) payload.get("productId")).longValue();
            // 세션에 구독 정보 저장
            session.getAttributes().put("subscribedProductId", productId);

            session.sendMessage(new TextMessage(
                String.format("{\"type\":\"subscribed\",\"productId\":%d}", productId)
            ));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        log.info("WebSocket disconnected: sessionId={}, status={}", session.getId(), status);
    }

    /**
     * 모든 구독자에게 재고 변경 알림
     */
    public void broadcastStockUpdate(Long productId, Integer newStock) {
        String message = String.format(
            "{\"type\":\"stockUpdate\",\"productId\":%d,\"stock\":%d,\"timestamp\":%d}",
            productId, newStock, System.currentTimeMillis()
        );

        sessions.values().forEach(session -> {
            try {
                Long subscribedId = (Long) session.getAttributes().get("subscribedProductId");
                if (subscribedId != null && subscribedId.equals(productId)) {
                    session.sendMessage(new TextMessage(message));
                }
            } catch (Exception e) {
                log.error("Failed to send stock update to session: {}", session.getId(), e);
            }
        });

        log.info("Stock update broadcasted: productId={}, stock={}, recipients={}",
                 productId, newStock, sessions.size());
    }

    /**
     * 재고 부족 경고 알림
     */
    public void sendLowStockAlert(Long productId, Integer stock, Integer threshold) {
        String message = String.format(
            "{\"type\":\"lowStockAlert\",\"productId\":%d,\"stock\":%d,\"threshold\":%d}",
            productId, stock, threshold
        );

        sessions.values().forEach(session -> {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (Exception e) {
                log.error("Failed to send low stock alert: {}", e.getMessage());
            }
        });
    }
}
