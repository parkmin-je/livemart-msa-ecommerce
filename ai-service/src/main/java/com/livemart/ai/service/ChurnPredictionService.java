package com.livemart.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.HunterAlphaClient;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 이탈 예측 서비스 — Hunter Alpha (복잡한 행동 패턴 분석)
 * 주간 배치로 전체 사용자 스코어링
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChurnPredictionService {

    private final HunterAlphaClient hunterAlphaClient;
    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public ChurnResponse predict(ChurnRequest request) {
        try {
            double cancelRate = request.getTotalOrders() > 0
                    ? (double) request.getCancelledOrders() / request.getTotalOrders() * 100
                    : 0;

            String prompt = String.format("""
                    사용자 행동 데이터:
                    - 총 주문 수: %d건
                    - 마지막 주문: %d일 전
                    - 평균 주문금액: %.0f원
                    - 취소율: %.1f%%
                    - 주요 구매 카테고리: %s
                    - 월 로그인: %d회

                    이탈 위험도를 분석하고 JSON 응답:
                    {"churnScore": 0-100, "churnRisk": "LOW/MEDIUM/HIGH", "retentionAction": "COUPON/RECOMMENDATION/EMAIL/NONE", "retentionMessage": "맞춤 한국어 메시지"}
                    """,
                    request.getTotalOrders(), request.getDaysSinceLastOrder(),
                    request.getAvgOrderAmount(), cancelRate,
                    request.getTopCategory() != null ? request.getTopCategory() : "없음",
                    request.getLoginFrequencyPerMonth());

            boolean useHunter = hunterAlphaClient.isEnabled();
            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model(useHunter ? "xiaomi/mimo-v2-pro" : "gpt-4o-mini")
                    .messages(List.of(
                            OpenAiRequest.Message.system("이커머스 고객 이탈 예측 전문가입니다. JSON만 응답하세요."),
                            OpenAiRequest.Message.user(prompt)
                    ))
                    .temperature(0.2)
                    .maxTokens(300)
                    .build();

            OpenAiResponse response;
            if (useHunter) {
                response = hunterAlphaClient.chat(aiRequest);
            } else {
                try {
                    response = openAiClient.chat(aiRequest);
                } catch (Exception e) {
                    log.warn("OpenAI unavailable for churn prediction: {}", e.getMessage());
                    return demoChurnResponse(request);
                }
            }

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoChurnResponse(request);
            }

            String content = response.choices().get(0).message().content();
            String json = content.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);

            return ChurnResponse.builder()
                    .userId(request.getUserId())
                    .churnScore(node.path("churnScore").asInt(0))
                    .churnRisk(node.path("churnRisk").asText("LOW"))
                    .retentionAction(node.path("retentionAction").asText("NONE"))
                    .retentionMessage(node.path("retentionMessage").asText(""))
                    .demoMode(false)
                    .build();

        } catch (Exception e) {
            log.error("Churn prediction error: {}", e.getMessage());
            return demoChurnResponse(request);
        }
    }

    private ChurnResponse demoChurnResponse(ChurnRequest req) {
        int score = req.getDaysSinceLastOrder() > 30 ? 70 : req.getDaysSinceLastOrder() > 14 ? 40 : 15;
        return ChurnResponse.builder()
                .userId(req.getUserId())
                .churnScore(score)
                .churnRisk(score > 60 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW")
                .retentionAction(score > 60 ? "COUPON" : score > 30 ? "RECOMMENDATION" : "NONE")
                .retentionMessage(score > 60 ? "오랜만이에요! 10% 할인 쿠폰을 드릴게요" : "고객님께 맞는 신상품이 도착했어요!")
                .demoMode(true)
                .build();
    }
}
