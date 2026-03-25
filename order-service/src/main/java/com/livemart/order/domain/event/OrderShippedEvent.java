package com.livemart.order.domain.event;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * 주문 배송 시작 도메인 이벤트
 *
 * 구독자:
 * - notification-service: 배송 시작 알림 (운송장 번호 포함)
 * - analytics-service: 배송 리드타임 통계
 */
@Getter
@Builder
public class OrderShippedEvent implements DomainEvent {

    @Builder.Default
    private final UUID eventId = UUID.randomUUID();

    @Builder.Default
    private final Instant occurredAt = Instant.now();

    private final Long orderId;
    private final String orderNumber;
    private final Long userId;
    private final String trackingNumber;
    private final String courierCode;   // 택배사 코드 (CJ, LOTTE, POST 등)
    private final String deliveryAddress;

    @Override
    public String getEventType() {
        return "ORDER_SHIPPED";
    }

    @Override
    public String getAggregateId() {
        return orderId != null ? orderId.toString() : orderNumber;
    }
}
