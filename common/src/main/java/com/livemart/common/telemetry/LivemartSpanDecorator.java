package com.livemart.common.telemetry;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.propagation.Propagator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.function.Supplier;

/**
 * LiveMart 커스텀 스팬 데코레이터 (OpenTelemetry 표준)
 *
 * Spring Boot 3.x의 Micrometer Tracing + OTLP Exporter 활용.
 * Jaeger/Tempo가 OTLP 형식으로 스팬을 수집.
 *
 * 기능:
 * 1. 비즈니스 속성 추가 (user.id, order.id, product.id)
 * 2. DB 쿼리 추적 (쿼리 타입, 테이블명)
 * 3. Kafka 메시지 추적 (baggage 전파 — 서비스 간 컨텍스트 유지)
 * 4. 에러 마킹 (예외 타입, 메시지)
 *
 * 사용 예:
 *   @Autowired LivemartSpanDecorator decorator;
 *
 *   // 주문 처리 스팬에 비즈니스 속성 추가
 *   decorator.withOrderSpan("createOrder", orderId, userId, () -> {
 *       // 주문 처리 로직
 *   });
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LivemartSpanDecorator {

    private final Tracer tracer;

    // ── 비즈니스 스팬 태그 상수 ──────────────────────────────────
    public static final String TAG_USER_ID = "livemart.user.id";
    public static final String TAG_ORDER_ID = "livemart.order.id";
    public static final String TAG_ORDER_NUMBER = "livemart.order.number";
    public static final String TAG_PRODUCT_ID = "livemart.product.id";
    public static final String TAG_PAYMENT_ID = "livemart.payment.id";
    public static final String TAG_SERVICE_NAME = "livemart.service";
    public static final String TAG_OPERATION = "livemart.operation";
    public static final String TAG_KAFKA_TOPIC = "livemart.kafka.topic";
    public static final String TAG_KAFKA_KEY = "livemart.kafka.key";
    public static final String TAG_DB_TABLE = "livemart.db.table";
    public static final String TAG_CACHE_HIT = "livemart.cache.hit";

    /**
     * 현재 활성 스팬에 비즈니스 태그 추가
     * (기존 스팬에 컨텍스트 보강)
     */
    public void tagCurrentSpan(Map<String, String> tags) {
        Span span = tracer.currentSpan();
        if (span == null) {
            log.trace("활성 스팬 없음 — 태그 무시");
            return;
        }
        tags.forEach(span::tag);
    }

    /**
     * 사용자 ID를 현재 스팬에 태깅
     */
    public void tagUserId(Long userId) {
        if (userId != null) {
            tagCurrentSpan(Map.of(TAG_USER_ID, userId.toString()));
        }
    }

    /**
     * 주문 정보를 현재 스팬에 태깅
     */
    public void tagOrder(Long orderId, String orderNumber) {
        Span span = tracer.currentSpan();
        if (span == null) return;
        if (orderId != null) span.tag(TAG_ORDER_ID, orderId.toString());
        if (orderNumber != null) span.tag(TAG_ORDER_NUMBER, orderNumber);
    }

    /**
     * 상품 ID를 현재 스팬에 태깅
     */
    public void tagProductId(Long productId) {
        if (productId != null) {
            tagCurrentSpan(Map.of(TAG_PRODUCT_ID, productId.toString()));
        }
    }

    /**
     * Kafka 메시지 발행 스팬 생성 (Producer 추적)
     *
     * @param topic   Kafka 토픽
     * @param key     메시지 키 (파티셔닝 키, 보통 orderId/userId)
     * @param action  실제 발행 로직
     */
    public <T> T withKafkaProducerSpan(String topic, String key, Supplier<T> action) {
        Span span = tracer.nextSpan()
            .name("kafka.producer." + topic)
            .tag(TAG_KAFKA_TOPIC, topic)
            .tag(TAG_KAFKA_KEY, key != null ? key : "null")
            .tag("messaging.system", "kafka")
            .tag("messaging.destination", topic)
            .tag("messaging.operation", "send")
            .start();

        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            return action.get();
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * Kafka 메시지 소비 스팬 생성 (Consumer 추적)
     * 부모 스팬: Producer에서 전파된 B3/W3C 트레이스 컨텍스트
     */
    public <T> T withKafkaConsumerSpan(String topic, String groupId, Supplier<T> action) {
        Span span = tracer.nextSpan()
            .name("kafka.consumer." + topic)
            .tag(TAG_KAFKA_TOPIC, topic)
            .tag("messaging.system", "kafka")
            .tag("messaging.consumer.group", groupId)
            .tag("messaging.operation", "receive")
            .start();

        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            return action.get();
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * DB 쿼리 스팬 생성
     *
     * @param table      테이블명
     * @param operation  SELECT, INSERT, UPDATE, DELETE
     */
    public <T> T withDbSpan(String table, String operation, Supplier<T> action) {
        Span span = tracer.nextSpan()
            .name("db." + operation.toLowerCase() + "." + table)
            .tag(TAG_DB_TABLE, table)
            .tag("db.operation", operation)
            .tag("db.system", "postgresql")
            .start();

        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            return action.get();
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * Redis 캐시 작업 스팬 생성
     */
    public <T> T withCacheSpan(String operation, String key, Supplier<T> action) {
        Span span = tracer.nextSpan()
            .name("cache." + operation)
            .tag("cache.system", "redis")
            .tag("cache.key", key)
            .tag("cache.operation", operation)
            .start();

        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            T result = action.get();
            // 캐시 히트/미스 여부 태깅 (result == null이면 MISS)
            span.tag(TAG_CACHE_HIT, result != null ? "true" : "false");
            return result;
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * 일반 비즈니스 작업 스팬 생성
     *
     * @param operationName 스팬 이름 (예: "order.create", "payment.process")
     * @param tags          추가 태그 (nullable)
     */
    public <T> T withSpan(String operationName, Map<String, String> tags, Supplier<T> action) {
        Span span = tracer.nextSpan().name(operationName);
        if (tags != null) {
            tags.forEach(span::tag);
        }
        span.start();

        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            return action.get();
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * 주문 처리 스팬 (편의 메서드)
     */
    public <T> T withOrderSpan(String operation, Long orderId, Long userId, Supplier<T> action) {
        return withSpan(
            "order." + operation,
            Map.of(
                TAG_ORDER_ID, orderId != null ? orderId.toString() : "unknown",
                TAG_USER_ID, userId != null ? userId.toString() : "unknown",
                TAG_OPERATION, operation
            ),
            action
        );
    }

    /**
     * 현재 Trace ID 반환 (로그 연계용)
     * MDC에 traceId가 자동 설정되지만, 명시적으로 필요한 경우 사용
     */
    public String currentTraceId() {
        Span span = tracer.currentSpan();
        if (span == null) return "no-trace";
        return span.context().traceId();
    }
}
