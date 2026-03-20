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
 * 동적 가격 추천 서비스 — GPT-4o-mini
 * 경쟁사 가격, 재고 수준, 판매 속도 기반 최적 가격 전략
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DynamicPricingService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public DynamicPricingResponse recommend(DynamicPricingRequest request) {
        try {
            String prompt = String.format("""
                    가격 최적화 분석:
                    - 상품: %s (%s)
                    - 현재 가격: %.0f원
                    - 원가: %.0f원
                    - 경쟁사 평균: %.0f원
                    - 현재 재고: %d개
                    - 최근 7일 판매량: %d개

                    최적 가격 전략 JSON 응답:
                    {"recommendedPrice": 숫자, "minPrice": 숫자, "maxPrice": 숫자, "strategy": "PENETRATION/PREMIUM/COMPETITIVE/CLEARANCE", "reasoning": "한국어 이유", "expectedRevenueLift": 소수(퍼센트)}
                    """,
                    request.getProductName(), request.getCategory(),
                    request.getCurrentPrice(), request.getCostPrice(),
                    request.getAvgCompetitorPrice(), request.getCurrentStock(), request.getSoldLast7Days());

            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model("gpt-4o-mini")
                    .messages(List.of(
                            OpenAiRequest.Message.system("이커머스 가격 전략 전문가입니다. JSON만 응답하세요."),
                            OpenAiRequest.Message.user(prompt)
                    ))
                    .temperature(0.2)
                    .maxTokens(300)
                    .build();

            OpenAiResponse response = openAiClient.chat(aiRequest);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoPricingResponse(request);
            }

            String content = response.choices().get(0).message().content();
            String json = content.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);

            return DynamicPricingResponse.builder()
                    .productId(request.getProductId())
                    .recommendedPrice(node.path("recommendedPrice").asDouble(request.getCurrentPrice()))
                    .minPrice(node.path("minPrice").asDouble(request.getCostPrice() * 1.1))
                    .maxPrice(node.path("maxPrice").asDouble(request.getCurrentPrice() * 1.5))
                    .strategy(node.path("strategy").asText("COMPETITIVE"))
                    .reasoning(node.path("reasoning").asText(""))
                    .expectedRevenueLift(node.path("expectedRevenueLift").asDouble(0))
                    .demoMode(false)
                    .build();

        } catch (Exception e) {
            log.error("Dynamic pricing error: {}", e.getMessage());
            return demoPricingResponse(request);
        }
    }

    private DynamicPricingResponse demoPricingResponse(DynamicPricingRequest req) {
        double recommended = req.getAvgCompetitorPrice() > 0
                ? req.getAvgCompetitorPrice() * 0.95
                : req.getCurrentPrice();
        return DynamicPricingResponse.builder()
                .productId(req.getProductId())
                .recommendedPrice(Math.round(recommended / 100.0) * 100.0)
                .minPrice(req.getCostPrice() > 0 ? req.getCostPrice() * 1.2 : req.getCurrentPrice() * 0.8)
                .maxPrice(req.getCurrentPrice() * 1.3)
                .strategy("COMPETITIVE")
                .reasoning("경쟁사 대비 5% 낮은 가격으로 시장 점유율 확보 전략 [데모]")
                .expectedRevenueLift(3.5)
                .demoMode(true)
                .build();
    }
}
