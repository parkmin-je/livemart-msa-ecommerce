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
import java.util.stream.Collectors;

/**
 * 수요 예측 서비스 — Hunter Alpha (복잡한 시계열 패턴 분석)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DemandForecastService {

    private final HunterAlphaClient hunterAlphaClient;
    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public DemandForecastResponse forecast(DemandForecastRequest request) {
        try {
            String salesHistory = request.getWeeklySales() != null && !request.getWeeklySales().isEmpty()
                    ? request.getWeeklySales().stream().map(String::valueOf).collect(Collectors.joining(", "))
                    : "데이터 없음";

            String prompt = String.format("""
                    상품 수요 예측:
                    - 상품: %s (%s)
                    - 현재 재고: %d개
                    - 현재 가격: %.0f원
                    - 최근 8주 주간 판매량: [%s]

                    수요를 분석하고 JSON 응답:
                    {"forecastNextWeek": 숫자, "forecastNextMonth": 숫자, "recommendedReorderPoint": 숫자, "recommendedOrderQuantity": 숫자, "trend": "RISING/STABLE/DECLINING", "confidenceScore": 0.0~1.0, "insight": "한국어 인사이트"}
                    """,
                    request.getProductName(), request.getCategory(),
                    request.getCurrentStock(), request.getCurrentPrice(), salesHistory);

            boolean useHunter = hunterAlphaClient.isEnabled();
            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model(useHunter ? "xiaomi/mimo-v2-pro" : "gpt-4o-mini")
                    .messages(List.of(
                            OpenAiRequest.Message.system("이커머스 수요 예측 전문가입니다. JSON만 응답하세요."),
                            OpenAiRequest.Message.user(prompt)
                    ))
                    .temperature(0.2)
                    .maxTokens(400)
                    .build();

            OpenAiResponse response;
            if (useHunter) {
                response = hunterAlphaClient.chat(aiRequest);
            } else {
                try {
                    response = openAiClient.chat(aiRequest);
                } catch (Exception e) {
                    log.warn("OpenAI unavailable for demand forecast: {}", e.getMessage());
                    return demoForecast(request);
                }
            }

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoForecast(request);
            }

            String content = response.choices().get(0).message().content();
            String json = content.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);

            return DemandForecastResponse.builder()
                    .productId(request.getProductId())
                    .forecastNextWeek(node.path("forecastNextWeek").asInt(0))
                    .forecastNextMonth(node.path("forecastNextMonth").asInt(0))
                    .recommendedReorderPoint(node.path("recommendedReorderPoint").asInt(20))
                    .recommendedOrderQuantity(node.path("recommendedOrderQuantity").asInt(50))
                    .trend(node.path("trend").asText("STABLE"))
                    .confidenceScore(node.path("confidenceScore").asDouble(0.7))
                    .insight(node.path("insight").asText(""))
                    .demoMode(false)
                    .build();

        } catch (Exception e) {
            log.error("Demand forecast error: {}", e.getMessage());
            return demoForecast(request);
        }
    }

    private DemandForecastResponse demoForecast(DemandForecastRequest req) {
        int avgWeeklySales = req.getWeeklySales() != null && !req.getWeeklySales().isEmpty()
                ? (int) req.getWeeklySales().stream().mapToInt(i -> i).average().orElse(10)
                : 10;
        return DemandForecastResponse.builder()
                .productId(req.getProductId())
                .forecastNextWeek(avgWeeklySales)
                .forecastNextMonth(avgWeeklySales * 4)
                .recommendedReorderPoint(avgWeeklySales * 2)
                .recommendedOrderQuantity(avgWeeklySales * 8)
                .trend("STABLE")
                .confidenceScore(0.6)
                .insight("최근 평균 판매량 기준 예측. AI API 연동 시 정밀도 향상 가능.")
                .demoMode(true)
                .build();
    }
}
