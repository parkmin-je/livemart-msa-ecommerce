package com.livemart.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.FraudScoreRequest;
import com.livemart.ai.dto.FraudScoreResponse;
import com.livemart.ai.dto.OpenAiResponse;
import com.livemart.ai.exception.AiServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("FraudDetectionService 단위 테스트")
class FraudDetectionServiceTest {

    @Mock
    OpenAiClient openAiClient;

    @InjectMocks
    FraudDetectionService fraudDetectionService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // ObjectMapper는 @InjectMocks가 주입하지 못하므로 리플렉션으로 직접 주입
        try {
            var field = FraudDetectionService.class.getDeclaredField("objectMapper");
            field.setAccessible(true);
            field.set(fraudDetectionService, objectMapper);
        } catch (Exception ignored) {}
    }

    // -------------------------------------------------------------------------
    // 헬퍼: OpenAiResponse 빌더
    // -------------------------------------------------------------------------

    private OpenAiResponse mockResponse(String content) {
        return new OpenAiResponse(
                "chatcmpl-test",
                "chat.completion",
                0L,
                "gpt-4o-mini",
                List.of(new OpenAiResponse.Choice(
                        0,
                        new OpenAiResponse.Message("assistant", content),
                        null,
                        "stop"
                )),
                new OpenAiResponse.Usage(50, 80, 130)
        );
    }

    // -------------------------------------------------------------------------
    // 테스트 1: 정상 주문 → 낮은 위험도 응답
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("정상 주문 정보 입력 시 LOW 위험도와 APPROVE 액션을 반환한다")
    void score_normalOrder_returnsLowRisk() {
        // given
        FraudScoreRequest request = FraudScoreRequest.builder()
                .orderId(1001L)
                .userId(42L)
                .orderAmount(new BigDecimal("35000"))
                .itemCount(2)
                .productCategories(List.of("의류", "패션잡화"))
                .shippingAddress("서울시 강남구")
                .userOrderCount(15)
                .recentOrderCount(1)
                .accountAgeDays(365L)
                .paymentMethod("신용카드")
                .build();

        String aiJson = """
                {"riskScore": 5, "riskLevel": "LOW", "action": "APPROVE", "reasoning": "정상적인 구매 패턴"}
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        FraudScoreResponse result = fraudDetectionService.score(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getRiskScore()).isEqualTo(5);
        assertThat(result.getRiskLevel()).isEqualTo("LOW");
        assertThat(result.getAction()).isEqualTo("APPROVE");
        assertThat(result.getOrderId()).isEqualTo(1001L);
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 2: 고액 주문 + 신규 계정 → 높은 위험도 응답
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("고액 주문과 신규 계정(1일) 조합 시 HIGH 위험도와 BLOCK 액션을 반환한다")
    void score_highValueNewAccount_returnsHighRisk() {
        // given
        FraudScoreRequest request = FraudScoreRequest.builder()
                .orderId(2002L)
                .userId(99L)
                .orderAmount(new BigDecimal("5000000"))
                .itemCount(10)
                .productCategories(List.of("전자기기"))
                .shippingAddress("부산시 해운대구")
                .userOrderCount(1)
                .recentOrderCount(3)
                .accountAgeDays(1L)
                .paymentMethod("가상계좌")
                .build();

        String aiJson = """
                {"riskScore": 80, "riskLevel": "HIGH", "action": "BLOCK", "reasoning": "신규 계정의 대규모 주문으로 사기 위험 높음"}
                """;

        given(openAiClient.chat(any())).willReturn(mockResponse(aiJson));

        // when
        FraudScoreResponse result = fraudDetectionService.score(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getRiskScore()).isEqualTo(80);
        assertThat(result.getRiskLevel()).isEqualTo("HIGH");
        assertThat(result.getAction()).isEqualTo("BLOCK");
        assertThat(result.getOrderId()).isEqualTo(2002L);
        assertThat(result.isDemoMode()).isFalse();
    }

    // -------------------------------------------------------------------------
    // 테스트 3: OpenAI가 null 반환 → 데모 모드 폴백
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI 응답이 null이면 데모 모드 응답을 반환한다")
    void score_openAiReturnsNull_fallsBackToDemo() {
        // given
        FraudScoreRequest request = FraudScoreRequest.builder()
                .orderId(3003L)
                .userId(7L)
                .orderAmount(new BigDecimal("20000"))
                .itemCount(1)
                .productCategories(List.of("식품"))
                .shippingAddress("서울시 송파구")
                .userOrderCount(5)
                .recentOrderCount(0)
                .accountAgeDays(90L)
                .paymentMethod("카카오페이")
                .build();

        given(openAiClient.chat(any())).willReturn(null);

        // when
        FraudScoreResponse result = fraudDetectionService.score(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getOrderId()).isEqualTo(3003L);
        assertThat(result.getAction()).isEqualTo("APPROVE");
        assertThat(result.getRiskLevel()).isEqualTo("LOW");
    }

    // -------------------------------------------------------------------------
    // 테스트 4: 잘못된 JSON 응답 → 데모 모드 폴백
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI가 잘못된 JSON을 반환하면 데모 모드 응답으로 폴백한다")
    void score_invalidJson_fallsBackToDemo() {
        // given
        FraudScoreRequest request = FraudScoreRequest.builder()
                .orderId(4004L)
                .userId(13L)
                .orderAmount(new BigDecimal("75000"))
                .itemCount(3)
                .productCategories(List.of("스포츠"))
                .shippingAddress("대전시 유성구")
                .userOrderCount(8)
                .recentOrderCount(2)
                .accountAgeDays(180L)
                .paymentMethod("삼성페이")
                .build();

        // 파싱 불가능한 깨진 JSON 문자열
        given(openAiClient.chat(any())).willReturn(mockResponse("이것은 JSON이 아닙니다 { broken json !!!"));

        // when
        FraudScoreResponse result = fraudDetectionService.score(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getOrderId()).isEqualTo(4004L);
        assertThat(result.getAction()).isEqualTo("APPROVE");
    }

    // -------------------------------------------------------------------------
    // 테스트 5: OpenAI 클라이언트 예외 발생 → 데모 모드 폴백
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OpenAI 클라이언트에서 예외 발생 시 데모 모드 응답으로 폴백한다")
    void score_openAiThrowsException_fallsBackToDemo() {
        // given
        FraudScoreRequest request = FraudScoreRequest.builder()
                .orderId(5005L)
                .userId(21L)
                .orderAmount(new BigDecimal("150000"))
                .itemCount(5)
                .productCategories(List.of("가구"))
                .shippingAddress("인천시 연수구")
                .userOrderCount(3)
                .recentOrderCount(1)
                .accountAgeDays(30L)
                .paymentMethod("신용카드")
                .build();

        given(openAiClient.chat(any()))
                .willThrow(new AiServiceException("AI 서비스 일시적 오류", new RuntimeException("timeout")));

        // when
        FraudScoreResponse result = fraudDetectionService.score(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.isDemoMode()).isTrue();
        assertThat(result.getOrderId()).isEqualTo(5005L);
        assertThat(result.getRiskScore()).isEqualTo(5);
    }
}
