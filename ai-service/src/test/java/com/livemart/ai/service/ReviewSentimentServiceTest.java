package com.livemart.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.OpenAiResponse;
import com.livemart.ai.dto.ReviewSentimentRequest;
import com.livemart.ai.dto.ReviewSentimentResponse;
import com.livemart.ai.exception.AiServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewSentimentService 단위 테스트")
class ReviewSentimentServiceTest {

    @Mock
    OpenAiClient openAiClient;

    @InjectMocks
    ReviewSentimentService reviewSentimentService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // ObjectMapper를 리플렉션으로 주입
        try {
            var field = ReviewSentimentService.class.getDeclaredField("objectMapper");
            field.setAccessible(true);
            field.set(reviewSentimentService, objectMapper);
        } catch (Exception ignored) {}
    }

    // -------------------------------------------------------------------------
    // 헬퍼: OpenAiResponse 빌더
    // -------------------------------------------------------------------------

    private OpenAiResponse mockResponse(String content) {
        return new OpenAiResponse(
                "chatcmpl-sentiment-test",
                "chat.completion",
                0L,
                "gpt-4o-mini",
                List.of(new OpenAiResponse.Choice(
                        0,
                        new OpenAiResponse.Message("assistant", content),
                        null,
                        "stop"
                )),
                new OpenAiResponse.Usage(40, 90, 130)
        );
    }

    // -------------------------------------------------------------------------
    // 테스트 1: 긍정적인 리뷰 → POSITIVE 감성, PUBLISH 액션
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("5점 긍정 리뷰는 POSITIVE 감성과 PUBLISH 모더레이션 액션을 반환한다")
    void analyze_positiveReview_returnsPositiveSentiment() {
        // given
        ReviewSentimentRequest request = ReviewSentimentRequest.builder()
                .reviewId(1L)
                .productId(100L)
                .reviewText("정말 품질이 좋고 배송도 빨라서 너무 만족합니다. 다음에도 구매할 의향이 있습니다.")
                .rating(5)
                .build();

        String aiJson = """
                {
                  "sentiment": "POSITIVE",
                  "sentimentScore": 0.95,
                  "moderationAction": "PUBLISH",
                  "moderationReason": null,
                  "aspects": {"quality": "positive", "delivery": "positive", "value": "positive"},
                  "helpfulnessScore": 0.85
                }
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        ReviewSentimentResponse result = reviewSentimentService.analyze(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getReviewId()).isEqualTo(1L);
        assertThat(result.getSentiment()).isEqualTo("POSITIVE");
        assertThat(result.getSentimentScore()).isGreaterThan(0.9);
        assertThat(result.getModerationAction()).isEqualTo("PUBLISH");
        assertThat(result.getModerationReason()).isNull();
        assertThat(result.getAspects()).containsEntry("quality", "positive");
        assertThat(result.getHelpfulnessScore()).isEqualTo(0.85);
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 2: 부정적인 리뷰 → NEGATIVE 감성, FLAG/PUBLISH 액션
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("1점 부정 리뷰는 NEGATIVE 감성과 낮은 감성 점수를 반환한다")
    void analyze_negativeReview_returnsNegativeSentiment() {
        // given
        ReviewSentimentRequest request = ReviewSentimentRequest.builder()
                .reviewId(2L)
                .productId(200L)
                .reviewText("품질이 너무 나쁘고 사진과 완전 다릅니다. 환불 신청했습니다. 절대 추천하지 않아요.")
                .rating(1)
                .build();

        String aiJson = """
                {
                  "sentiment": "NEGATIVE",
                  "sentimentScore": 0.08,
                  "moderationAction": "PUBLISH",
                  "moderationReason": null,
                  "aspects": {"quality": "negative", "delivery": "negative", "value": "negative"},
                  "helpfulnessScore": 0.70
                }
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        ReviewSentimentResponse result = reviewSentimentService.analyze(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getReviewId()).isEqualTo(2L);
        assertThat(result.getSentiment()).isEqualTo("NEGATIVE");
        assertThat(result.getSentimentScore()).isLessThan(0.2);
        assertThat(result.getModerationAction()).isEqualTo("PUBLISH");
        assertThat(result.getAspects()).containsEntry("quality", "negative");
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 3: 중립적인 리뷰 → NEUTRAL 감성
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("3점 중립 리뷰는 NEUTRAL 감성과 중간 수준의 감성 점수를 반환한다")
    void analyze_neutralReview_returnsNeutralSentiment() {
        // given
        ReviewSentimentRequest request = ReviewSentimentRequest.builder()
                .reviewId(3L)
                .productId(300L)
                .reviewText("그냥 그렇습니다. 특별히 좋은 것도 나쁜 것도 없어요.")
                .rating(3)
                .build();

        String aiJson = """
                {
                  "sentiment": "NEUTRAL",
                  "sentimentScore": 0.50,
                  "moderationAction": "PUBLISH",
                  "moderationReason": null,
                  "aspects": {"quality": "neutral", "delivery": "neutral", "value": "neutral"},
                  "helpfulnessScore": 0.40
                }
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        ReviewSentimentResponse result = reviewSentimentService.analyze(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getReviewId()).isEqualTo(3L);
        assertThat(result.getSentiment()).isEqualTo("NEUTRAL");
        assertThat(result.getSentimentScore()).isBetween(0.4, 0.6);
        assertThat(result.getModerationAction()).isEqualTo("PUBLISH");
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 4: 부적절한 리뷰 → FLAG 모더레이션 + 이유 포함
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("욕설이나 광고성 내용이 포함된 리뷰는 FLAG 모더레이션 액션과 이유를 반환한다")
    void analyze_inappropriateReview_returnsFlagAction() {
        // given
        ReviewSentimentRequest request = ReviewSentimentRequest.builder()
                .reviewId(4L)
                .productId(400L)
                .reviewText("이 상품 별로임. 저쪽 쇼핑몰 가서 사세요 거기 훨씬 저렴함. ⭐⭐⭐⭐⭐")
                .rating(2)
                .build();

        String aiJson = """
                {
                  "sentiment": "NEGATIVE",
                  "sentimentScore": 0.20,
                  "moderationAction": "FLAG",
                  "moderationReason": "경쟁 쇼핑몰 홍보 의심 내용 포함",
                  "aspects": {"quality": "negative", "delivery": "neutral", "value": "negative"},
                  "helpfulnessScore": 0.15
                }
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        ReviewSentimentResponse result = reviewSentimentService.analyze(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getReviewId()).isEqualTo(4L);
        assertThat(result.getModerationAction()).isEqualTo("FLAG");
        assertThat(result.getModerationReason()).isNotNull();
        assertThat(result.getModerationReason()).contains("경쟁 쇼핑몰");
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 5: OpenAI 예외 발생 → 데모 모드 폴백 (rating 기반 감성)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI 호출 실패 시 별점 기반의 데모 모드 감성 응답을 반환한다")
    void analyze_openAiFailure_fallsBackToDemoWithRatingBasedSentiment() {
        // given — 5점 리뷰: 데모 모드에서 POSITIVE 기대
        ReviewSentimentRequest request = ReviewSentimentRequest.builder()
                .reviewId(5L)
                .productId(500L)
                .reviewText("최고의 제품입니다!")
                .rating(5)
                .build();

        given(openAiClient.chat(any()))
                .willThrow(new AiServiceException("AI 서비스 일시적 오류", new RuntimeException("network error")));

        // when
        ReviewSentimentResponse result = reviewSentimentService.analyze(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getReviewId()).isEqualTo(5L);
        // rating=5 → demoSentimentResponse에서 "POSITIVE" 반환
        assertThat(result.getSentiment()).isEqualTo("POSITIVE");
        assertThat(result.getModerationAction()).isEqualTo("PUBLISH");
        // sentimentScore = rating / 5.0 = 5 / 5.0 = 1.0
        assertThat(result.getSentimentScore()).isEqualTo(1.0);
    }

    // -------------------------------------------------------------------------
    // 테스트 6: OpenAI가 null 반환 → 데모 모드 폴백 (저점 리뷰)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI 응답이 null이면 1점 리뷰에 대해 NEGATIVE 데모 감성을 반환한다")
    void analyze_openAiReturnsNull_lowRating_returnsNegativeDemoSentiment() {
        // given — 2점 리뷰: 데모 모드에서 NEGATIVE 기대
        ReviewSentimentRequest request = ReviewSentimentRequest.builder()
                .reviewId(6L)
                .productId(600L)
                .reviewText("별로예요.")
                .rating(2)
                .build();

        given(openAiClient.chat(any())).willReturn(null);

        // when
        ReviewSentimentResponse result = reviewSentimentService.analyze(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getReviewId()).isEqualTo(6L);
        // rating=2 (<=2) → demoSentimentResponse에서 "NEGATIVE" 반환
        assertThat(result.getSentiment()).isEqualTo("NEGATIVE");
        // sentimentScore = 2 / 5.0 = 0.4
        assertThat(result.getSentimentScore()).isEqualTo(0.4);
    }

    // -------------------------------------------------------------------------
    // 테스트 7: 잘못된 JSON 응답 → 데모 모드 폴백
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI가 잘못된 JSON을 반환하면 데모 모드 응답으로 폴백한다")
    void analyze_invalidJsonResponse_fallsBackToDemo() {
        // given
        ReviewSentimentRequest request = ReviewSentimentRequest.builder()
                .reviewId(7L)
                .productId(700L)
                .reviewText("보통이에요.")
                .rating(3)
                .build();

        given(openAiClient.chat(any())).willReturn(mockResponse("올바르지 않은 JSON 응답 {{ error }}"));

        // when
        ReviewSentimentResponse result = reviewSentimentService.analyze(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getReviewId()).isEqualTo(7L);
        // rating=3 (3 > 2, 3 < 4) → NEUTRAL
        assertThat(result.getSentiment()).isEqualTo("NEUTRAL");
    }
}
