package com.livemart.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.OpenAiResponse;
import com.livemart.ai.dto.RecommendationRequest;
import com.livemart.ai.service.RecommendationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock OpenAiClient openAiClient;
    @Mock RedisTemplate<String, Object> redisTemplate;
    @Mock ValueOperations<String, Object> valueOperations;

    @InjectMocks RecommendationService recommendationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
        given(valueOperations.get(anyString())).willReturn(null); // 캐시 미스
        var om = objectMapper;
        try {
            var field = RecommendationService.class.getDeclaredField("objectMapper");
            field.setAccessible(true);
            field.set(recommendationService, om);
            var modelField = RecommendationService.class.getDeclaredField("model");
            modelField.setAccessible(true);
            modelField.set(recommendationService, "gpt-4o-mini");
        } catch (Exception ignored) {}
    }

    @Test
    @DisplayName("캐시 미스 시 OpenAI API 호출 후 추천 반환")
    void recommend_cacheMiss_callsOpenAi() {
        // given
        var request = new RecommendationRequest(1L,
                List.of(100L, 200L), List.of("전자기기"),
                List.of("삼성 갤럭시 S25", "애플 에어팟 Pro", "소니 헤드폰"), 3);

        String mockJson = """
                {
                  "reasoning": "전자기기 구매 이력 기반 추천",
                  "recommendations": [
                    {"productName": "애플 에어팟 Pro", "category": "전자기기", "reason": "무선 이어폰 관심", "relevanceScore": 0.92}
                  ]
                }
                """;

        var mockResponse = new OpenAiResponse("id", "chat.completion", 0L, "gpt-4o-mini",
                List.of(new OpenAiResponse.Choice(0,
                        new OpenAiResponse.Message("assistant", mockJson), null, "stop")),
                new OpenAiResponse.Usage(50, 100, 150));

        given(openAiClient.chat(any())).willReturn(mockResponse);

        // when
        var result = recommendationService.recommend(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.userId()).isEqualTo(1L);
        assertThat(result.cached()).isFalse();
        assertThat(result.recommendations()).isNotEmpty();
        assertThat(result.reasoning()).contains("전자기기");
    }

    @Test
    @DisplayName("캐시 히트 시 OpenAI 호출 없이 캐시 반환")
    void recommend_cacheHit_returnsCache() {
        // given
        var cachedResponse = new com.livemart.ai.dto.RecommendationResponse(
                1L, List.of(), "캐시된 추천 이유", false, 10L);
        given(valueOperations.get(anyString())).willReturn(cachedResponse);

        var request = new RecommendationRequest(1L, List.of(), List.of(), List.of(), 5);

        // when
        var result = recommendationService.recommend(request);

        // then
        assertThat(result.cached()).isTrue();
    }
}
