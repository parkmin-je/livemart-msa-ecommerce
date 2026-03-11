package com.livemart.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.OpenAiRequest;
import com.livemart.ai.dto.RecommendationRequest;
import com.livemart.ai.dto.RecommendationResponse;
import com.livemart.ai.dto.RecommendationResponse.RecommendedItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * AI 개인화 상품 추천 서비스
 *
 * 전략:
 * 1. Redis 캐시 확인 (TTL 10분)
 * 2. 미스 시 OpenAI GPT-4o-mini 호출
 * 3. JSON 응답 파싱 → RecommendationResponse 변환
 * 4. 결과 캐싱
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final String CACHE_KEY = "ai:recommend:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    private final OpenAiClient openAiClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${openai.model.recommendation:gpt-4o-mini}")
    private String model;

    @SuppressWarnings("unchecked")
    public RecommendationResponse recommend(RecommendationRequest req) {
        long start = System.currentTimeMillis();
        String cacheKey = CACHE_KEY + req.userId();

        // 캐시 히트
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.debug("Recommendation cache hit for user={}", req.userId());
            try {
                var result = objectMapper.convertValue(cached, RecommendationResponse.class);
                return new RecommendationResponse(
                        result.userId(), result.recommendations(), result.reasoning(),
                        true, System.currentTimeMillis() - start);
            } catch (Exception ignored) {}
        }

        // LLM 호출
        var prompt = buildRecommendationPrompt(req);
        var request = OpenAiRequest.builder()
                .model(model)
                .messages(List.of(
                        OpenAiRequest.Message.system(RECOMMENDATION_SYSTEM_PROMPT),
                        OpenAiRequest.Message.user(prompt)
                ))
                .maxTokens(1024)
                .temperature(0.7)
                .stream(false)
                .responseFormat(OpenAiRequest.ResponseFormat.jsonObject())
                .build();

        var aiResponse = openAiClient.chat(request);
        var content = aiResponse.extractContent();

        // JSON 파싱
        List<RecommendedItem> items;
        String reasoning;
        try {
            Map<String, Object> parsed = objectMapper.readValue(content, new TypeReference<>() {});
            reasoning = (String) parsed.getOrDefault("reasoning", "");
            List<Map<String, Object>> rawItems = (List<Map<String, Object>>) parsed.getOrDefault("recommendations", List.of());
            items = rawItems.stream().map(m -> new RecommendedItem(
                    (String) m.getOrDefault("productName", ""),
                    (String) m.getOrDefault("category", ""),
                    (String) m.getOrDefault("reason", ""),
                    ((Number) m.getOrDefault("relevanceScore", 0.8)).doubleValue()
            )).toList();
        } catch (Exception e) {
            log.error("Failed to parse recommendation JSON: {}", e.getMessage());
            items = List.of();
            reasoning = content;
        }

        var response = new RecommendationResponse(
                req.userId(), items.stream().limit(req.count()).toList(),
                reasoning, false, System.currentTimeMillis() - start);

        // 캐싱
        try {
            redisTemplate.opsForValue().set(cacheKey, response, CACHE_TTL);
        } catch (Exception e) {
            log.warn("Failed to cache recommendation: {}", e.getMessage());
        }

        log.info("Recommendation generated: user={}, items={}, latency={}ms",
                req.userId(), items.size(), response.latencyMs());
        return response;
    }

    private String buildRecommendationPrompt(RecommendationRequest req) {
        return """
                사용자 구매 이력:
                - 구매 상품 ID: %s
                - 구매 카테고리: %s

                현재 판매 중인 상품 목록 (최대 50개):
                %s

                추천 개수: %d개
                """.formatted(
                req.purchasedProductIds() != null ? req.purchasedProductIds().toString() : "없음",
                req.purchasedCategories() != null ? String.join(", ", req.purchasedCategories()) : "없음",
                req.availableProductNames() != null ? String.join("\n", req.availableProductNames()) : "없음",
                req.count()
        );
    }

    private static final String RECOMMENDATION_SYSTEM_PROMPT = """
            당신은 한국 이커머스 플랫폼의 AI 상품 추천 엔진입니다.
            사용자의 구매 이력을 분석하여 가장 관련성 높은 상품을 추천하세요.

            반드시 다음 JSON 형식으로만 응답하세요:
            {
              "reasoning": "추천 근거 한 문장 요약",
              "recommendations": [
                {
                  "productName": "상품명",
                  "category": "카테고리",
                  "reason": "이 상품을 추천하는 구체적인 이유",
                  "relevanceScore": 0.95
                }
              ]
            }

            규칙:
            - 구매 이력과 연관성이 높은 상품 우선
            - relevanceScore는 0.0~1.0 사이 소수점 2자리
            - 이미 구매한 상품은 제외
            - 한국어로 응답
            """;
}
