package com.livemart.order.controller;

import com.livemart.order.eventsourcing.EventStore;
import com.livemart.order.eventsourcing.EventStore.DomainEvent;
import com.livemart.order.eventsourcing.EventStore.EventStoreStats;
import com.livemart.order.eventsourcing.OrderAggregate;
import com.livemart.order.eventsourcing.OrderAggregate.OrderState;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Event Sourcing API
 */
@RestController
@RequestMapping("/api/v1/event-sourcing")
@RequiredArgsConstructor
public class EventSourcingController {

    private final EventStore eventStore;

    /**
     * 주문 생성 (이벤트 소싱)
     */
    @PostMapping("/orders")
    public ResponseEntity<DomainEvent> createOrder(@RequestBody CreateOrderRequest request) {
        OrderAggregate aggregate = new OrderAggregate();
        DomainEvent event = aggregate.createOrder(request.orderId(), request.userId());

        eventStore.save(request.orderId(), event);

        return ResponseEntity.ok(event);
    }

    /**
     * 주문 항목 추가
     */
    @PostMapping("/orders/{orderId}/items")
    public ResponseEntity<DomainEvent> addOrderItem(
            @PathVariable String orderId,
            @RequestBody AddOrderItemRequest request) {

        OrderAggregate aggregate = new OrderAggregate();
        eventStore.reconstruct(orderId, aggregate);

        DomainEvent event = aggregate.addOrderItem(
            orderId,
            request.productId(),
            request.quantity(),
            request.price()
        );

        eventStore.save(orderId, event);

        return ResponseEntity.ok(event);
    }

    /**
     * 주문 확정
     */
    @PostMapping("/orders/{orderId}/confirm")
    public ResponseEntity<DomainEvent> confirmOrder(@PathVariable String orderId) {
        OrderAggregate aggregate = new OrderAggregate();
        eventStore.reconstruct(orderId, aggregate);

        DomainEvent event = aggregate.confirmOrder(orderId);
        eventStore.save(orderId, event);

        return ResponseEntity.ok(event);
    }

    /**
     * 주문 배송 시작
     */
    @PostMapping("/orders/{orderId}/ship")
    public ResponseEntity<DomainEvent> shipOrder(
            @PathVariable String orderId,
            @RequestBody ShipOrderRequest request) {

        OrderAggregate aggregate = new OrderAggregate();
        eventStore.reconstruct(orderId, aggregate);

        DomainEvent event = aggregate.shipOrder(orderId, request.trackingNumber());
        eventStore.save(orderId, event);

        return ResponseEntity.ok(event);
    }

    /**
     * 주문 배송 완료
     */
    @PostMapping("/orders/{orderId}/deliver")
    public ResponseEntity<DomainEvent> deliverOrder(@PathVariable String orderId) {
        OrderAggregate aggregate = new OrderAggregate();
        eventStore.reconstruct(orderId, aggregate);

        DomainEvent event = aggregate.deliverOrder(orderId);
        eventStore.save(orderId, event);

        return ResponseEntity.ok(event);
    }

    /**
     * 주문 취소
     */
    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<DomainEvent> cancelOrder(
            @PathVariable String orderId,
            @RequestBody CancelOrderRequest request) {

        OrderAggregate aggregate = new OrderAggregate();
        eventStore.reconstruct(orderId, aggregate);

        DomainEvent event = aggregate.cancelOrder(orderId, request.reason());
        eventStore.save(orderId, event);

        return ResponseEntity.ok(event);
    }

    /**
     * 주문 현재 상태 조회
     */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderState> getOrderState(@PathVariable String orderId) {
        OrderAggregate aggregate = new OrderAggregate();
        OrderState state = eventStore.reconstruct(orderId, aggregate);

        return ResponseEntity.ok(state);
    }

    /**
     * 주문 이벤트 히스토리 조회
     */
    @GetMapping("/orders/{orderId}/events")
    public ResponseEntity<List<DomainEvent>> getOrderEvents(@PathVariable String orderId) {
        List<DomainEvent> events = eventStore.getEvents(orderId);
        return ResponseEntity.ok(events);
    }

    /**
     * 특정 시점의 주문 상태 조회 (Time Travel)
     */
    @GetMapping("/orders/{orderId}/at-time")
    public ResponseEntity<OrderState> getOrderStateAtTime(
            @PathVariable String orderId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime pointInTime) {

        OrderAggregate aggregate = new OrderAggregate();
        OrderState state = eventStore.reconstructAtPointInTime(orderId, pointInTime, aggregate);

        return ResponseEntity.ok(state);
    }

    /**
     * Event Store 통계
     */
    @GetMapping("/stats")
    public ResponseEntity<EventStoreStats> getStats() {
        EventStoreStats stats = eventStore.getStats();
        return ResponseEntity.ok(stats);
    }

    /**
     * 이벤트 타입별 통계
     */
    @GetMapping("/stats/event-types")
    public ResponseEntity<Map<String, Long>> getEventTypeStats() {
        Map<String, Long> stats = eventStore.getEventTypeStats();
        return ResponseEntity.ok(stats);
    }

    /**
     * 이벤트 스트림 검증
     */
    @GetMapping("/orders/{orderId}/validate")
    public ResponseEntity<ValidationResult> validateEventStream(@PathVariable String orderId) {
        boolean isValid = eventStore.validateEventStream(orderId);
        return ResponseEntity.ok(new ValidationResult(orderId, isValid));
    }

    // DTOs

    public record CreateOrderRequest(
        String orderId,
        Long userId
    ) {}

    public record AddOrderItemRequest(
        Long productId,
        int quantity,
        BigDecimal price
    ) {}

    public record ShipOrderRequest(
        String trackingNumber
    ) {}

    public record CancelOrderRequest(
        String reason
    ) {}

    public record ValidationResult(
        String orderId,
        boolean isValid
    ) {}
}
