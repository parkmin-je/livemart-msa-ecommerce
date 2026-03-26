package com.livemart.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AI 기반 주문 사기 탐지 — GPT-4o-mini (빠른 실시간 응답)
 * order-events Kafka 구독 또는 결제 전 동기 호출
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FraudDetectionService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public FraudScoreResponse score(FraudScoreRequest request) {
        try {
            String prompt = buildFraudPrompt(request);
            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model("gpt-4o-mini")
                    .messages(List.of(
                            OpenAiRequest.Message.system("당신은 이커머스 사기 탐지 전문가입니다. JSON만 응답하세요."),
                            OpenAiRequest.Message.user(prompt)
                    ))
                    .temperature(0.1)
                    .maxTokens(300)
                    .build();

            OpenAiResponse response = openAiClient.chat(aiRequest);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoFraudResponse(request);
            }
            return parseFraudResponse(response.choices().get(0).message().content(), request.getOrderId());

        } catch (Exception e) {
            log.error("Fraud detection error: {}", e.getMessage());
            return demoFraudResponse(request);
        }
    }

    private String buildFraudPrompt(FraudScoreRequest req) {
        return String.format("""
                주문 정보:
                - 주문금액: %s원
                - 상품수: %d개
                - 카테고리: %s
                - 배송지: %s
                - 계정 주문 이력: 총 %d건, 최근 1시간 %d건
                - 계정 나이: %d일
                - 결제 수단: %s

                위 정보로 사기 위험도를 분석하고 JSON 응답:
                {"riskScore": 0-100, "riskLevel": "LOW/MEDIUM/HIGH/CRITICAL", "action": "APPROVE/REVIEW/BLOCK", "reasoning": "한국어 이유"}
                """,
                req.getOrderAmount() != null ? req.getOrderAmount().toPlainString() : "0",
                req.getItemCount() != null ? req.getItemCount() : 0,
                req.getProductCategories() != null ? String.join(", ", req.getProductCategories()) : "없음",
                req.getShippingAddress() != null ? req.getShippingAddress() : "없음",
                req.getUserOrderCount() != null ? req.getUserOrderCount() : 0,
                req.getRecentOrderCount() != null ? req.getRecentOrderCount() : 0,
                req.getAccountAgeDays() != null ? req.getAccountAgeDays() : 0,
                req.getPaymentMethod() != null ? req.getPaymentMethod() : "없음");
    }

    private FraudScoreResponse parseFraudResponse(String content, Long orderId) {
        try {
            String json = content.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);
            return FraudScoreResponse.builder()
                    .orderId(orderId)
                    .riskScore(node.path("riskScore").asInt(0))
                    .riskLevel(node.path("riskLevel").asText("LOW"))
                    .action(node.path("action").asText("APPROVE"))
                    .reasoning(node.path("reasoning").asText(""))
                    .demoMode(false)
                    .build();
        } catch (Exception e) {
            log.error("Fraud parse error: {}", e.getMessage());
            return demoFraudResponse(orderId);
        }
    }

    private FraudScoreResponse demoFraudResponse(FraudScoreRequest req) {
        return demoFraudResponse(req.getOrderId());
    }

    private FraudScoreResponse demoFraudResponse(Long orderId) {
        return FraudScoreResponse.builder()
                .orderId(orderId)
                .riskScore(5)
                .riskLevel("LOW")
                .action("APPROVE")
                .reasoning("데모 모드: 정상 주문으로 판단")
                .demoMode(true)
                .build();
    }
}
