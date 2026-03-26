package com.livemart.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.DynamicPricingRequest;
import com.livemart.ai.dto.DynamicPricingResponse;
import com.livemart.ai.dto.OpenAiResponse;
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
@DisplayName("DynamicPricingService 단위 테스트")
class DynamicPricingServiceTest {

    @Mock
    OpenAiClient openAiClient;

    @InjectMocks
    DynamicPricingService dynamicPricingService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // ObjectMapper를 리플렉션으로 주입
        try {
            var field = DynamicPricingService.class.getDeclaredField("objectMapper");
            field.setAccessible(true);
            field.set(dynamicPricingService, objectMapper);
        } catch (Exception ignored) {}
    }

    // -------------------------------------------------------------------------
    // 헬퍼: OpenAiResponse 빌더
    // -------------------------------------------------------------------------

    private OpenAiResponse mockResponse(String content) {
        return new OpenAiResponse(
                "chatcmpl-pricing-test",
                "chat.completion",
                0L,
                "gpt-4o-mini",
                List.of(new OpenAiResponse.Choice(
                        0,
                        new OpenAiResponse.Message("assistant", content),
                        null,
                        "stop"
                )),
                new OpenAiResponse.Usage(60, 100, 160)
        );
    }

    // -------------------------------------------------------------------------
    // 테스트 1: 재고 과잉 + 저조한 판매 → CLEARANCE 전략
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("재고 과잉과 낮은 판매량 상황에서 CLEARANCE 전략을 추천한다")
    void recommend_overstock_returnsClearanceStrategy() {
        // given — 재고 500개, 7일 판매 5개 (과잉 재고 상황)
        DynamicPricingRequest request = DynamicPricingRequest.builder()
                .productId(101L)
                .productName("겨울 패딩 자켓")
                .category("의류")
                .currentPrice(89000.0)
                .costPrice(40000.0)
                .avgCompetitorPrice(85000.0)
                .currentStock(500)
                .soldLast7Days(5)
                .build();

        String aiJson = """
                {
                  "recommendedPrice": 62000,
                  "minPrice": 48000,
                  "maxPrice": 89000,
                  "strategy": "CLEARANCE",
                  "reasoning": "재고 과잉으로 재고 소진을 위한 할인 가격 전략 적용",
                  "expectedRevenueLift": -5.0
                }
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        DynamicPricingResponse result = dynamicPricingService.recommend(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getProductId()).isEqualTo(101L);
        assertThat(result.getStrategy()).isEqualTo("CLEARANCE");
        assertThat(result.getRecommendedPrice()).isEqualTo(62000.0);
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 2: 프리미엄 가격대 상품 → PREMIUM 전략
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("현재 가격이 경쟁사 평균보다 높은 프리미엄 상품에 PREMIUM 전략을 추천한다")
    void recommend_premiumProduct_returnsPremiumStrategy() {
        // given — 현재 가격(200,000) > 경쟁사 평균(150,000)
        DynamicPricingRequest request = DynamicPricingRequest.builder()
                .productId(202L)
                .productName("프리미엄 무선 이어폰")
                .category("전자기기")
                .currentPrice(200000.0)
                .costPrice(80000.0)
                .avgCompetitorPrice(150000.0)
                .currentStock(30)
                .soldLast7Days(50)
                .build();

        String aiJson = """
                {
                  "recommendedPrice": 210000,
                  "minPrice": 96000,
                  "maxPrice": 250000,
                  "strategy": "PREMIUM",
                  "reasoning": "높은 브랜드 인지도와 수요 기반 프리미엄 포지셔닝 유지",
                  "expectedRevenueLift": 8.5
                }
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        DynamicPricingResponse result = dynamicPricingService.recommend(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getProductId()).isEqualTo(202L);
        assertThat(result.getStrategy()).isEqualTo("PREMIUM");
        assertThat(result.getRecommendedPrice()).isEqualTo(210000.0);
        assertThat(result.getExpectedRevenueLift()).isEqualTo(8.5);
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 3: OpenAI 예외 발생 → 데모 응답 반환
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI 호출 실패 시 데모 모드의 유효한 가격 응답을 반환한다")
    void recommend_openAiFailure_returnsDemoResponse() {
        // given
        DynamicPricingRequest request = DynamicPricingRequest.builder()
                .productId(303L)
                .productName("일반 텀블러")
                .category("생활용품")
                .currentPrice(25000.0)
                .costPrice(12000.0)
                .avgCompetitorPrice(23000.0)
                .currentStock(100)
                .soldLast7Days(20)
                .build();

        given(openAiClient.chat(any()))
                .willThrow(new AiServiceException("AI 서비스 일시적 오류", new RuntimeException("connection timeout")));

        // when
        DynamicPricingResponse result = dynamicPricingService.recommend(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getProductId()).isEqualTo(303L);
        // 데모 응답에서 recommendedPrice는 avgCompetitorPrice * 0.95 기반으로 null이 아닌 값
        assertThat(result.getRecommendedPrice()).isGreaterThan(0.0);
        assertThat(result.getMinPrice()).isGreaterThan(0.0);
        assertThat(result.getMaxPrice()).isGreaterThan(0.0);
        assertThat(result.getStrategy()).isNotNull();
    }

    // -------------------------------------------------------------------------
    // 테스트 4: OpenAI가 null 반환 → 데모 응답 반환
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI 응답이 null이면 데모 모드 가격 응답을 반환한다")
    void recommend_openAiReturnsNull_returnsDemoResponse() {
        // given
        DynamicPricingRequest request = DynamicPricingRequest.builder()
                .productId(404L)
                .productName("기본 볼펜 세트")
                .category("문구")
                .currentPrice(5000.0)
                .costPrice(2000.0)
                .avgCompetitorPrice(4800.0)
                .currentStock(200)
                .soldLast7Days(30)
                .build();

        given(openAiClient.chat(any())).willReturn(null);

        // when
        DynamicPricingResponse result = dynamicPricingService.recommend(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getProductId()).isEqualTo(404L);
        // 데모: avgCompetitorPrice(4800) * 0.95 = 4560 → 반올림 100단위 → 4600
        assertThat(result.getRecommendedPrice()).isEqualTo(4600.0);
    }

    // -------------------------------------------------------------------------
    // 테스트 5: 잘못된 JSON 응답 → 데모 응답 폴백
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI가 잘못된 JSON을 반환하면 데모 모드 응답으로 폴백한다")
    void recommend_invalidJsonResponse_returnsDemoResponse() {
        // given
        DynamicPricingRequest request = DynamicPricingRequest.builder()
                .productId(505L)
                .productName("유기농 커피")
                .category("식품")
                .currentPrice(18000.0)
                .costPrice(8000.0)
                .avgCompetitorPrice(16000.0)
                .currentStock(80)
                .soldLast7Days(40)
                .build();

        given(openAiClient.chat(any())).willReturn(mockResponse("파싱 불가 응답 }{[ 오류"));

        // when
        DynamicPricingResponse result = dynamicPricingService.recommend(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getProductId()).isEqualTo(505L);
        assertThat(result.getRecommendedPrice()).isGreaterThan(0.0);
    }
}
