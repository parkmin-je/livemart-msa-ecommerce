package com.livemart.ai.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.dto.FraudScoreRequest;
import com.livemart.ai.dto.FraudScoreResponse;
import com.livemart.ai.service.FraudDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * order-events Kafka 구독 → AI 자동화 트리거
 *
 * ORDER_CREATED: 실시간 사기 탐지 실행 (결제 완료 직후)
 * HIGH/CRITICAL 위험도 탐지 시 경고 로그 → 알림 시스템 연동 포인트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventAiConsumer {

    private final FraudDetectionService fraudDetectionService;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = "order-events",
            groupId = "ai-service-fraud-detection",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onOrderEvent(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            String eventType = event.path("eventType").asText("");

            if ("ORDER_CREATED".equals(eventType)) {
                handleOrderCreated(event);
            }
            // 향후 확장: ORDER_CANCELLED → churn signal, etc.

        } catch (Exception e) {
            log.error("OrderEventAiConsumer processing error: {}", e.getMessage());
        }
    }

    private void handleOrderCreated(JsonNode event) {
        Long orderId = event.path("orderId").asLong(0);
        Long userId = event.path("userId").asLong(0);

        String amountStr = event.path("totalAmount").asText("0");
        BigDecimal amount;
        try {
            amount = new BigDecimal(amountStr);
        } catch (NumberFormatException e) {
            amount = BigDecimal.ZERO;
        }

        // 아이템 카테고리 추출
        List<String> categories = new ArrayList<>();
        JsonNode items = event.path("items");
        if (items.isArray()) {
            items.forEach(item -> {
                String cat = item.path("category").asText(null);
                if (cat != null && !cat.isEmpty()) categories.add(cat);
            });
        }

        FraudScoreRequest req = FraudScoreRequest.builder()
                .orderId(orderId)
                .userId(userId)
                .orderAmount(amount)
                .itemCount(items.isArray() ? items.size() : 0)
                .productCategories(categories)
                .paymentMethod(event.path("paymentMethod").asText("UNKNOWN"))
                .shippingAddress(event.path("shippingAddress").asText(null))
                .userOrderCount(event.path("userOrderCount").asInt(0))
                .recentOrderCount(event.path("recentOrderCount").asInt(0))
                .accountAgeDays(event.path("accountAgeDays").asLong(0))
                .build();

        FraudScoreResponse result = fraudDetectionService.score(req);

        if ("HIGH".equals(result.getRiskLevel()) || "CRITICAL".equals(result.getRiskLevel())) {
            log.warn("[FRAUD ALERT] orderId={} userId={} score={} level={} action={} reason={}",
                    orderId, userId, result.getRiskScore(), result.getRiskLevel(),
                    result.getAction(), result.getReasoning());
        } else {
            log.debug("[FRAUD OK] orderId={} score={} level={}",
                    orderId, result.getRiskScore(), result.getRiskLevel());
        }
    }
}
