package com.livemart.order.domain.event;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * 주문 생성 도메인 이벤트
 *
 * 발행 시점: Order Aggregate의 createOrder() 팩토리 메서드 실행 시
 *
 * 구독자:
 * - inventory-service: 재고 차감
 * - payment-service: 결제 요청
 * - notification-service: 주문 확인 알림 발송
 * - analytics-service: 매출 통계 갱신
 * - CQRS Read Model: 주문 조회 캐시 갱신
 */
@Getter
@Builder
public class OrderCreatedEvent implements DomainEvent {

    @Builder.Default
    private final UUID eventId = UUID.randomUUID();

    @Builder.Default
    private final Instant occurredAt = Instant.now();

    // Aggregate 정보
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;

    // 주문 상세
    private final BigDecimal totalAmount;
    private final String paymentMethod;
    private final String deliveryAddress;
    private final List<OrderItemInfo> items;

    @Override
    public String getEventType() {
        return "ORDER_CREATED";
    }

    @Override
    public String getAggregateId() {
        return orderId != null ? orderId.toString() : orderNumber;
    }

    /**
     * 주문 항목 정보 (이벤트 내 비정규화 — 이벤트 자기완결성 원칙)
     * 구독 서비스가 별도 조회 없이 처리 가능하도록 필요한 정보 포함.
     */
    public record OrderItemInfo(
        Long productId,
        String productName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice
    ) {}
}
