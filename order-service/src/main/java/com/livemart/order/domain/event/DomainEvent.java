package com.livemart.order.domain.event;

import java.time.Instant;
import java.util.UUID;

/**
 * 도메인 이벤트 인터페이스 (DDD Domain Event)
 *
 * 도메인 이벤트는 과거에 발생한 중요한 비즈니스 사건을 나타냅니다.
 * Aggregate에서 발생된 이벤트는:
 * - 이벤트 소싱 (Event Sourcing)
 * - 타 바운디드 컨텍스트와의 통신 (Kafka)
 * - 읽기 모델 갱신 (CQRS Read Model Projection)
 * 에 활용됩니다.
 */
public interface DomainEvent {

    /**
     * 이벤트 고유 ID (멱등성 보장을 위한 중복 처리 키)
     */
    UUID getEventId();

    /**
     * 이벤트 발생 시각 (UTC)
     */
    Instant getOccurredAt();

    /**
     * 이벤트 타입 식별자 (Kafka 토픽 라우팅, 이벤트 소싱 복원에 사용)
     */
    String getEventType();

    /**
     * 이벤트가 속한 Aggregate ID
     */
    String getAggregateId();
}
