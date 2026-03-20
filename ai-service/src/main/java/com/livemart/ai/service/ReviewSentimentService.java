package com.livemart.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 리뷰 감성 분석 + 자동 모더레이션 — GPT-4o-mini
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewSentimentService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public ReviewSentimentResponse analyze(ReviewSentimentRequest request) {
        try {
            String prompt = String.format("""
                    리뷰 분석 요청:
                    - 별점: %d/5
                    - 내용: "%s"

                    다음 JSON으로 분석하세요:
                    {
                      "sentiment": "POSITIVE/NEGATIVE/NEUTRAL",
                      "sentimentScore": 0.0~1.0,
                      "moderationAction": "PUBLISH/FLAG/REJECT",
                      "moderationReason": "이유 (부적절하지 않으면 null)",
                      "aspects": {"quality": "positive/negative/neutral", "delivery": "...", "value": "..."},
                      "helpfulnessScore": 0.0~1.0
                    }
                    """, request.getRating(), request.getReviewText());

            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model("gpt-4o-mini")
                    .messages(List.of(
                            OpenAiRequest.Message.system("한국어 리뷰 감성 분석 전문가입니다. JSON만 응답하세요."),
                            OpenAiRequest.Message.user(prompt)
                    ))
                    .temperature(0.1)
                    .maxTokens(300)
                    .build();

            OpenAiResponse response = openAiClient.chat(aiRequest);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoSentimentResponse(request);
            }

            String content = response.choices().get(0).message().content();
            String json = content.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);

            Map<String, String> aspects = new LinkedHashMap<>();
            if (node.has("aspects")) {
                node.get("aspects").fields().forEachRemaining(e -> aspects.put(e.getKey(), e.getValue().asText()));
            }

            String moderationReason = node.path("moderationReason").asText(null);
            if ("null".equals(moderationReason)) moderationReason = null;

            return ReviewSentimentResponse.builder()
                    .reviewId(request.getReviewId())
                    .sentiment(node.path("sentiment").asText("NEUTRAL"))
                    .sentimentScore(node.path("sentimentScore").asDouble(0.5))
                    .moderationAction(node.path("moderationAction").asText("PUBLISH"))
                    .moderationReason(moderationReason)
                    .aspects(aspects)
                    .helpfulnessScore(node.path("helpfulnessScore").asDouble(0.5))
                    .demoMode(false)
                    .build();

        } catch (Exception e) {
            log.error("Review sentiment error: {}", e.getMessage());
            return demoSentimentResponse(request);
        }
    }

    private ReviewSentimentResponse demoSentimentResponse(ReviewSentimentRequest req) {
        String sentiment = req.getRating() >= 4 ? "POSITIVE" : req.getRating() <= 2 ? "NEGATIVE" : "NEUTRAL";
        return ReviewSentimentResponse.builder()
                .reviewId(req.getReviewId())
                .sentiment(sentiment)
                .sentimentScore(req.getRating() / 5.0)
                .moderationAction("PUBLISH")
                .aspects(Map.of("quality", "positive", "delivery", "neutral", "value", "positive"))
                .helpfulnessScore(0.6)
                .demoMode(true)
                .build();
    }
}
