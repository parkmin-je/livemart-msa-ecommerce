package com.livemart.order.domain.event;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * 주문 취소 도메인 이벤트
 *
 * 구독자:
 * - inventory-service: 재고 복구
 * - payment-service: 환불 요청
 * - notification-service: 취소 완료 알림
 */
@Getter
@Builder
public class OrderCancelledEvent implements DomainEvent {

    @Builder.Default
    private final UUID eventId = UUID.randomUUID();

    @Builder.Default
    private final Instant occurredAt = Instant.now();

    private final Long orderId;
    private final String orderNumber;
    private final Long userId;
    private final String cancelReason;
    private final BigDecimal refundAmount;

    @Override
    public String getEventType() {
        return "ORDER_CANCELLED";
    }

    @Override
    public String getAggregateId() {
        return orderId != null ? orderId.toString() : orderNumber;
    }
}
