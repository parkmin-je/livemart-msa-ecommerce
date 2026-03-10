package com.livemart.gateway.apikey;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApiKeyService 단위 테스트")
class ApiKeyServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private ApiKeyService apiKeyService;

    @BeforeEach
    void setUp() {
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
    }

    @Nested
    @DisplayName("createApiKey")
    class CreateApiKeyTest {

        @Test
        @DisplayName("생성된 API Key는 lm_ 접두어를 가진다")
        void createApiKey_generatesLmPrefixedKey() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "테스트 키", "통합 테스트용", 1L, 500, List.of(), null);

            // when
            ApiKeyService.ApiKeyInfo result = apiKeyService.createApiKey(request);

            // then
            assertThat(result.apiKey()).startsWith("lm_");
            assertThat(result.apiKey()).hasSizeGreaterThan(10);
        }

        @Test
        @DisplayName("rateLimit 0 입력 시 기본값 1000 적용")
        void createApiKey_defaultRateLimit() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "기본 키", "기본 한도", 2L, 0, List.of(), null);

            // when
            ApiKeyService.ApiKeyInfo result = apiKeyService.createApiKey(request);

            // then
            assertThat(result.rateLimit()).isEqualTo(1000);
        }

        @Test
        @DisplayName("생성 직후 상태는 ACTIVE")
        void createApiKey_statusIsActive() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "활성 키", "활성 상태 검증", 3L, 100, List.of(), null);

            // when
            ApiKeyService.ApiKeyInfo result = apiKeyService.createApiKey(request);

            // then
            assertThat(result.status()).isEqualTo(ApiKeyService.ApiKeyStatus.ACTIVE);
            assertThat(result.createdAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("validateApiKey")
    class ValidateApiKeyTest {

        @Test
        @DisplayName("유효한 ACTIVE 키 — 검증 통과")
        void validateApiKey_activeKey_returnsValid() {
            // given — 먼저 키를 생성해 메모리 캐시에 올린다
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "유효 키", "검증용", 1L, 1000, List.of(), null);
            ApiKeyService.ApiKeyInfo created = apiKeyService.createApiKey(request);

            // Rate Limit 카운트: 현재 0
            given(valueOperations.get(anyString())).willReturn(null);

            // when
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey(created.apiKey(), "192.168.1.1");

            // then
            assertThat(result.valid()).isTrue();
            assertThat(result.message()).isEqualTo("Valid");
            assertThat(result.keyInfo()).isNotNull();
        }

        @Test
        @DisplayName("만료된 키 — EXPIRED 반환")
        void validateApiKey_expiredKey_returnsInvalid() {
            // given — 과거 만료일로 키 생성
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "만료 키", "만료 검증", 1L, 1000, List.of(),
                    LocalDateTime.now().minusDays(1));  // 어제 만료
            ApiKeyService.ApiKeyInfo created = apiKeyService.createApiKey(request);

            // when
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey(created.apiKey(), "10.0.0.1");

            // then
            assertThat(result.valid()).isFalse();
            assertThat(result.message()).containsIgnoringCase("expired");
        }

        @Test
        @DisplayName("존재하지 않는 키 — Invalid 반환")
        void validateApiKey_unknownKey_returnsInvalid() {
            // given — Redis에도 없음
            given(valueOperations.get(anyString())).willReturn(null);

            // when
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey("lm_nonexistent", "1.2.3.4");

            // then
            assertThat(result.valid()).isFalse();
            assertThat(result.message()).contains("Invalid");
        }

        @Test
        @DisplayName("IP 화이트리스트 — 허용되지 않은 IP 거부")
        void validateApiKey_ipNotWhitelisted_returnsInvalid() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "화이트리스트 키", "IP 제한", 1L, 1000,
                    List.of("192.168.0.1"), null);  // 특정 IP만 허용
            ApiKeyService.ApiKeyInfo created = apiKeyService.createApiKey(request);

            // Rate Limit: 현재 0
            given(valueOperations.get(anyString())).willReturn(null);

            // when
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey(created.apiKey(), "10.0.0.99");  // 허용 안된 IP

            // then
            assertThat(result.valid()).isFalse();
            assertThat(result.message()).contains("IP not allowed");
        }
    }

    @Nested
    @DisplayName("checkRateLimit (validateApiKey 경유)")
    class RateLimitTest {

        @Test
        @DisplayName("한도 이하 요청 — 검증 통과")
        void checkRateLimit_underLimit_returnsTrue() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "한도 테스트", "rate limit", 1L, 100, List.of(), null);
            ApiKeyService.ApiKeyInfo created = apiKeyService.createApiKey(request);

            // 현재 카운트 0 (한도 100)
            given(valueOperations.get(anyString())).willReturn(0L);

            // when
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey(created.apiKey(), "127.0.0.1");

            // then
            assertThat(result.valid()).isTrue();
        }

        @Test
        @DisplayName("한도 초과 요청 — Rate limit exceeded 반환")
        void checkRateLimit_overLimit_returnsFalse() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "초과 테스트", "rate limit exceeded", 1L, 100, List.of(), null);
            ApiKeyService.ApiKeyInfo created = apiKeyService.createApiKey(request);

            // 현재 카운트가 이미 한도(100) 이상
            given(valueOperations.get(anyString())).willReturn(100L);

            // when
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey(created.apiKey(), "127.0.0.1");

            // then
            assertThat(result.valid()).isFalse();
            assertThat(result.message()).contains("Rate limit");
        }

        @Test
        @DisplayName("정확히 한도-1 카운트 — 통과")
        void checkRateLimit_atLimitMinusOne_passes() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "경계 테스트", "boundary", 1L, 10, List.of(), null);
            ApiKeyService.ApiKeyInfo created = apiKeyService.createApiKey(request);

            given(valueOperations.get(anyString())).willReturn(9L);  // 한도 10, 현재 9

            // when
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey(created.apiKey(), "127.0.0.1");

            // then
            assertThat(result.valid()).isTrue();
        }
    }

    @Nested
    @DisplayName("revokeApiKey")
    class RevokeApiKeyTest {

        @Test
        @DisplayName("취소된 키 — 검증 거부")
        void revokeApiKey_revoked_validationFails() {
            // given
            ApiKeyService.CreateApiKeyRequest request = new ApiKeyService.CreateApiKeyRequest(
                    "취소 키", "revoke test", 1L, 1000, List.of(), null);
            ApiKeyService.ApiKeyInfo created = apiKeyService.createApiKey(request);

            // when — 취소 후 검증
            apiKeyService.revokeApiKey(created.apiKey());
            ApiKeyService.ValidationResult result =
                    apiKeyService.validateApiKey(created.apiKey(), "127.0.0.1");

            // then
            assertThat(result.valid()).isFalse();
            assertThat(result.message()).containsIgnoringCase("revoked");
        }
    }
}
