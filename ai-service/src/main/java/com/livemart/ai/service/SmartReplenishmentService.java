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
 * 스마트 재고 보충 서비스 — GPT-4o-mini
 * 리드타임, 판매 속도, 트렌드 기반 재고 보충 시점 최적화
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmartReplenishmentService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public ReplenishmentResponse recommend(ReplenishmentRequest request) {
        try {
            String prompt = String.format("""
                    재고 보충 최적화:
                    - 상품ID: %d
                    - 현재 재고: %d개
                    - 일평균 판매량: %.1f개
                    - 리드타임: %d일
                    - 판매 트렌드: %s

                    재고 보충 계획 JSON 응답:
                    {"shouldReorder": true/false, "urgency": "CRITICAL/HIGH/MEDIUM/LOW", "recommendedQuantity": 숫자, "reorderPoint": 숫자, "estimatedStockoutDays": 숫자, "reasoning": "한국어 이유"}
                    """,
                    request.getProductId() != null ? request.getProductId() : 0L,
                    request.getCurrentStock(),
                    request.getDailyAvgSales(), request.getLeadTimeDays(),
                    request.getTrend() != null ? request.getTrend() : "STABLE");

            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model("gpt-4o-mini")
                    .messages(List.of(
                            OpenAiRequest.Message.system("재고 관리 전문가입니다. JSON만 응답하세요."),
                            OpenAiRequest.Message.user(prompt)
                    ))
                    .temperature(0.1)
                    .maxTokens(300)
                    .build();

            OpenAiResponse response = openAiClient.chat(aiRequest);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoReplenishment(request);
            }

            String content = response.choices().get(0).message().content();
            String json = content.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);

            return ReplenishmentResponse.builder()
                    .productId(request.getProductId())
                    .shouldReorder(node.path("shouldReorder").asBoolean(false))
                    .urgency(node.path("urgency").asText("LOW"))
                    .recommendedQuantity(node.path("recommendedQuantity").asInt(50))
                    .reorderPoint(node.path("reorderPoint").asInt(20))
                    .estimatedStockoutDays(node.path("estimatedStockoutDays").asInt(999))
                    .reasoning(node.path("reasoning").asText(""))
                    .demoMode(false)
                    .build();

        } catch (Exception e) {
            log.error("Replenishment error: {}", e.getMessage());
            return demoReplenishment(request);
        }
    }

    private ReplenishmentResponse demoReplenishment(ReplenishmentRequest req) {
        double daysLeft = req.getDailyAvgSales() > 0
                ? req.getCurrentStock() / req.getDailyAvgSales()
                : 999;
        boolean shouldReorder = daysLeft < req.getLeadTimeDays() * 1.5;
        String urgency;
        if (daysLeft < req.getLeadTimeDays()) urgency = "CRITICAL";
        else if (daysLeft < req.getLeadTimeDays() * 2) urgency = "HIGH";
        else if (daysLeft < req.getLeadTimeDays() * 4) urgency = "MEDIUM";
        else urgency = "LOW";

        return ReplenishmentResponse.builder()
                .productId(req.getProductId())
                .shouldReorder(shouldReorder)
                .urgency(urgency)
                .recommendedQuantity((int) (req.getDailyAvgSales() * 30))
                .reorderPoint((int) (req.getDailyAvgSales() * req.getLeadTimeDays() * 1.5))
                .estimatedStockoutDays((int) daysLeft)
                .reasoning("일평균 " + req.getDailyAvgSales() + "개 판매 기준, 리드타임 " + req.getLeadTimeDays() + "일 고려 [데모]")
                .demoMode(true)
                .build();
    }
}
