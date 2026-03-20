package com.livemart.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 검색 의도 분석 서비스 — GPT-4o-mini + Redis 캐싱
 * 오타 수정, 검색 의도 분류, 키워드 확장
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchIntentService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    public SearchIntentResponse analyze(SearchIntentRequest request) {
        String cacheKey = "search-intent:" + request.getQuery().toLowerCase().trim();

        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof SearchIntentResponse res) return res;
        } catch (Exception e) {
            log.warn("Redis cache read failed for search intent: {}", e.getMessage());
        }

        try {
            String prompt = String.format("""
                    검색어: "%s"

                    한국어 이커머스 검색 의도 분석 후 JSON 응답:
                    {
                      "correctedQuery": "오타 수정된 검색어 (없으면 원본 그대로)",
                      "intent": "CATEGORY/SPECIFIC_PRODUCT/PRICE_COMPARE/GENERAL",
                      "expandedKeywords": ["관련키워드1", "관련키워드2", "관련키워드3"],
                      "suggestedCategory": "추천 카테고리 (없으면 null)"
                    }
                    """, request.getQuery());

            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model("gpt-4o-mini")
                    .messages(List.of(
                            OpenAiRequest.Message.system("한국어 이커머스 검색 전문가입니다. JSON만 응답하세요."),
                            OpenAiRequest.Message.user(prompt)
                    ))
                    .temperature(0.1)
                    .maxTokens(200)
                    .build();

            OpenAiResponse response = openAiClient.chat(aiRequest);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoSearchIntent(request);
            }

            String content = response.choices().get(0).message().content();
            String json = content.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);

            List<String> keywords = new ArrayList<>();
            if (node.has("expandedKeywords")) {
                node.get("expandedKeywords").forEach(k -> keywords.add(k.asText()));
            }

            String suggestedCategory = node.path("suggestedCategory").asText(null);
            if ("null".equals(suggestedCategory)) suggestedCategory = null;

            SearchIntentResponse result = SearchIntentResponse.builder()
                    .originalQuery(request.getQuery())
                    .correctedQuery(node.path("correctedQuery").asText(request.getQuery()))
                    .intent(node.path("intent").asText("GENERAL"))
                    .expandedKeywords(keywords)
                    .suggestedCategory(suggestedCategory)
                    .demoMode(false)
                    .build();

            try {
                redisTemplate.opsForValue().set(cacheKey, result, Duration.ofHours(1));
            } catch (Exception e) {
                log.warn("Redis cache write failed for search intent: {}", e.getMessage());
            }

            return result;

        } catch (Exception e) {
            log.error("Search intent error: {}", e.getMessage());
            return demoSearchIntent(request);
        }
    }

    private SearchIntentResponse demoSearchIntent(SearchIntentRequest req) {
        return SearchIntentResponse.builder()
                .originalQuery(req.getQuery())
                .correctedQuery(req.getQuery())
                .intent("GENERAL")
                .expandedKeywords(List.of(req.getQuery()))
                .demoMode(true)
                .build();
    }
}
