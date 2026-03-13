package com.livemart.common.idempotency;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("IdempotencyAspect")
class IdempotencyAspectTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOps;
    @Mock private org.aspectj.lang.ProceedingJoinPoint joinPoint;
    @Mock private IdempotencyKey idempotencyKey;
    @Mock private ServletRequestAttributes attrs;
    @Mock private HttpServletRequest request;

    @InjectMocks
    private IdempotencyAspect idempotencyAspect;

    @BeforeEach
    void setup() {
        given(redisTemplate.opsForValue()).willReturn(valueOps);
        given(attrs.getRequest()).willReturn(request);
        given(idempotencyKey.prefix()).willReturn("order");
        given(idempotencyKey.ttlSeconds()).willReturn(86400L);
    }

    @Nested
    @DisplayName("중복 요청 감지")
    class DuplicateDetection {

        @Test
        @DisplayName("동일한 Idempotency-Key 두 번째 요청 → IllegalStateException")
        void rejectsDuplicateRequest() throws Throwable {
            given(request.getHeader("Idempotency-Key")).willReturn("key-abc-123");
            given(valueOps.setIfAbsent(eq("idempotency:order:key-abc-123"), eq("PROCESSING"), any(Duration.class)))
                    .willReturn(false);
            given(valueOps.get("idempotency:order:key-abc-123")).willReturn("COMPLETED");

            try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
                mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(attrs);

                assertThatThrownBy(() -> idempotencyAspect.checkIdempotency(joinPoint, idempotencyKey))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("Duplicate request");
            }

            then(joinPoint).should(never()).proceed();
        }

        @Test
        @DisplayName("새로운 Idempotency-Key → 정상 처리 후 COMPLETED 마킹")
        void processesNewRequest_marksCompleted() throws Throwable {
            given(request.getHeader("Idempotency-Key")).willReturn("key-new-456");
            given(valueOps.setIfAbsent(anyString(), eq("PROCESSING"), any(Duration.class))).willReturn(true);
            given(joinPoint.proceed()).willReturn("result");

            try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
                mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(attrs);

                Object result = idempotencyAspect.checkIdempotency(joinPoint, idempotencyKey);

                assertThat(result).isEqualTo("result");
            }

            then(valueOps).should().set(
                    eq("idempotency:order:key-new-456"), eq("COMPLETED"), any(Duration.class));
        }

        @Test
        @DisplayName("Idempotency-Key 헤더 없음 → 멱등성 체크 건너뜀")
        void skipsCheck_whenNoHeader() throws Throwable {
            given(request.getHeader("Idempotency-Key")).willReturn(null);
            given(joinPoint.proceed()).willReturn("result");

            try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
                mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(attrs);

                Object result = idempotencyAspect.checkIdempotency(joinPoint, idempotencyKey);
                assertThat(result).isEqualTo("result");
            }

            then(redisTemplate).shouldHaveNoInteractions();
        }

        @Test
        @DisplayName("처리 중 예외 발생 → Redis 키 삭제 (재처리 허용)")
        void deletesRedisKey_onProcessingException() throws Throwable {
            given(request.getHeader("Idempotency-Key")).willReturn("key-fail-789");
            given(valueOps.setIfAbsent(anyString(), eq("PROCESSING"), any(Duration.class))).willReturn(true);
            given(joinPoint.proceed()).willThrow(new RuntimeException("processing error"));

            try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
                mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(attrs);

                assertThatThrownBy(() -> idempotencyAspect.checkIdempotency(joinPoint, idempotencyKey))
                        .isInstanceOf(RuntimeException.class);
            }

            then(redisTemplate).should().delete("idempotency:order:key-fail-789");
        }

        @Test
        @DisplayName("RequestAttributes null → 멱등성 체크 건너뜀")
        void skipsCheck_whenNoRequestContext() throws Throwable {
            given(joinPoint.proceed()).willReturn("result");

            try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
                mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(null);

                Object result = idempotencyAspect.checkIdempotency(joinPoint, idempotencyKey);
                assertThat(result).isEqualTo("result");
            }

            then(redisTemplate).shouldHaveNoInteractions();
        }
    }
}
