package com.livemart.order.eventsourcing;

import com.livemart.order.eventsourcing.EventStore.AggregateRoot;
import com.livemart.order.eventsourcing.EventStore.DomainEvent;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Order Aggregate (주문 집합체)
 *
 * Event Sourcing으로 주문 상태 관리:
 * - OrderCreated
 * - OrderItemAdded
 * - OrderConfirmed
 * - OrderShipped
 * - OrderDelivered
 * - OrderCancelled
 */
@Data
public class OrderAggregate implements AggregateRoot<OrderAggregate.OrderState> {

    private OrderState state;
    private long currentVersion;

    public OrderAggregate() {
        this.state = new OrderState();
        this.currentVersion = 0;
    }

    /**
     * 주문 생성 커맨드
     */
    public DomainEvent createOrder(String orderId, Long userId) {
        DomainEvent event = new DomainEvent(
            java.util.UUID.randomUUID().toString(),
            orderId,
            "OrderCreated",
            ++currentVersion,
            LocalDateTime.now(),
            Map.of(
                "orderId", orderId,
                "userId", userId,
                "status", "PENDING"
            )
        );

        apply(event);
        return event;
    }

    /**
     * 주문 항목 추가 커맨드
     */
    public DomainEvent addOrderItem(String orderId, Long productId, int quantity, BigDecimal price) {
        DomainEvent event = new DomainEvent(
            java.util.UUID.randomUUID().toString(),
            orderId,
            "OrderItemAdded",
            ++currentVersion,
            LocalDateTime.now(),
            Map.of(
                "productId", productId,
                "quantity", quantity,
                "price", price.doubleValue()
            )
        );

        apply(event);
        return event;
    }

    /**
     * 주문 확정 커맨드
     */
    public DomainEvent confirmOrder(String orderId) {
        if (!"PENDING".equals(state.status)) {
            throw new IllegalStateException("Cannot confirm order in status: " + state.status);
        }

        DomainEvent event = new DomainEvent(
            java.util.UUID.randomUUID().toString(),
            orderId,
            "OrderConfirmed",
            ++currentVersion,
            LocalDateTime.now(),
            Map.of("status", "CONFIRMED")
        );

        apply(event);
        return event;
    }

    /**
     * 주문 배송 시작 커맨드
     */
    public DomainEvent shipOrder(String orderId, String trackingNumber) {
        if (!"CONFIRMED".equals(state.status)) {
            throw new IllegalStateException("Cannot ship order in status: " + state.status);
        }

        DomainEvent event = new DomainEvent(
            java.util.UUID.randomUUID().toString(),
            orderId,
            "OrderShipped",
            ++currentVersion,
            LocalDateTime.now(),
            Map.of(
                "status", "SHIPPED",
                "trackingNumber", trackingNumber
            )
        );

        apply(event);
        return event;
    }

    /**
     * 주문 배송 완료 커맨드
     */
    public DomainEvent deliverOrder(String orderId) {
        if (!"SHIPPED".equals(state.status)) {
            throw new IllegalStateException("Cannot deliver order in status: " + state.status);
        }

        DomainEvent event = new DomainEvent(
            java.util.UUID.randomUUID().toString(),
            orderId,
            "OrderDelivered",
            ++currentVersion,
            LocalDateTime.now(),
            Map.of("status", "DELIVERED")
        );

        apply(event);
        return event;
    }

    /**
     * 주문 취소 커맨드
     */
    public DomainEvent cancelOrder(String orderId, String reason) {
        if ("DELIVERED".equals(state.status) || "CANCELLED".equals(state.status)) {
            throw new IllegalStateException("Cannot cancel order in status: " + state.status);
        }

        DomainEvent event = new DomainEvent(
            java.util.UUID.randomUUID().toString(),
            orderId,
            "OrderCancelled",
            ++currentVersion,
            LocalDateTime.now(),
            Map.of(
                "status", "CANCELLED",
                "reason", reason
            )
        );

        apply(event);
        return event;
    }

    /**
     * 이벤트 적용 (상태 변경)
     */
    @Override
    public void apply(DomainEvent event) {
        switch (event.eventType()) {
            case "OrderCreated" -> applyOrderCreated(event);
            case "OrderItemAdded" -> applyOrderItemAdded(event);
            case "OrderConfirmed" -> applyOrderConfirmed(event);
            case "OrderShipped" -> applyOrderShipped(event);
            case "OrderDelivered" -> applyOrderDelivered(event);
            case "OrderCancelled" -> applyOrderCancelled(event);
            default -> throw new IllegalArgumentException("Unknown event type: " + event.eventType());
        }

        currentVersion = event.version();
    }

    private void applyOrderCreated(DomainEvent event) {
        state.orderId = (String) event.payload().get("orderId");
        state.userId = ((Number) event.payload().get("userId")).longValue();
        state.status = (String) event.payload().get("status");
        state.items = new ArrayList<>();
        state.totalAmount = BigDecimal.ZERO;
        state.createdAt = event.timestamp();
    }

    private void applyOrderItemAdded(DomainEvent event) {
        Long productId = ((Number) event.payload().get("productId")).longValue();
        int quantity = ((Number) event.payload().get("quantity")).intValue();
        BigDecimal price = BigDecimal.valueOf(((Number) event.payload().get("price")).doubleValue());

        OrderItem item = new OrderItem(productId, quantity, price);
        state.items.add(item);
        state.totalAmount = state.totalAmount.add(price.multiply(BigDecimal.valueOf(quantity)));
    }

    private void applyOrderConfirmed(DomainEvent event) {
        state.status = (String) event.payload().get("status");
        state.confirmedAt = event.timestamp();
    }

    private void applyOrderShipped(DomainEvent event) {
        state.status = (String) event.payload().get("status");
        state.trackingNumber = (String) event.payload().get("trackingNumber");
        state.shippedAt = event.timestamp();
    }

    private void applyOrderDelivered(DomainEvent event) {
        state.status = (String) event.payload().get("status");
        state.deliveredAt = event.timestamp();
    }

    private void applyOrderCancelled(DomainEvent event) {
        state.status = (String) event.payload().get("status");
        state.cancelReason = (String) event.payload().get("reason");
        state.cancelledAt = event.timestamp();
    }

    @Override
    public OrderState getState() {
        return state;
    }

    @Override
    public void loadFromSnapshot(Map<String, Object> snapshot) {
        // 스냅샷에서 상태 복원 (간단한 구현)
        // 실제로는 직렬화/역직렬화 필요
        this.state = new OrderState();
        // TODO: snapshot 데이터로 state 복원
    }

    // Inner Classes

    @Data
    public static class OrderState {
        private String orderId;
        private Long userId;
        private String status;
        private List<OrderItem> items = new ArrayList<>();
        private BigDecimal totalAmount = BigDecimal.ZERO;
        private String trackingNumber;
        private String cancelReason;
        private LocalDateTime createdAt;
        private LocalDateTime confirmedAt;
        private LocalDateTime shippedAt;
        private LocalDateTime deliveredAt;
        private LocalDateTime cancelledAt;

        public boolean isActive() {
            return !"CANCELLED".equals(status) && !"DELIVERED".equals(status);
        }
    }

    public record OrderItem(
        Long productId,
        int quantity,
        BigDecimal price
    ) {}
}
