package com.livemart.product.inventory;

import com.livemart.product.domain.Product;
import com.livemart.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 재고 발주 관리 서비스
 * 발주 생성, 추적, 완료 처리
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReplenishmentOrderService {

    private final ProductRepository productRepository;

    // 임시 저장소 (실제로는 별도 DB 테이블 필요)
    private final Map<Long, ReplenishmentOrder> orderStore = new ConcurrentHashMap<>();
    private final AtomicLong orderIdGenerator = new AtomicLong(1);

    /**
     * 발주 생성
     */
    @Transactional
    public ReplenishmentOrder createOrder(Long productId, int quantity, int leadTimeDays) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

        LocalDateTime expectedArrival = LocalDateTime.now().plusDays(leadTimeDays);

        ReplenishmentOrder order = new ReplenishmentOrder(
            orderIdGenerator.getAndIncrement(),
            productId,
            product.getName(),
            quantity,
            product.getPrice().multiply(java.math.BigDecimal.valueOf(quantity)),
            OrderStatus.PENDING,
            LocalDateTime.now(),
            expectedArrival,
            leadTimeDays,
            null,
            generateTrackingNumber(productId)
        );

        orderStore.put(order.id(), order);

        log.info("Replenishment order created: orderId={}, productId={}, quantity={}, expectedArrival={}",
                 order.id(), productId, quantity, expectedArrival);

        return order;
    }

    /**
     * 발주 상태 업데이트
     */
    @Transactional
    public ReplenishmentOrder updateOrderStatus(Long orderId, OrderStatus newStatus) {
        ReplenishmentOrder order = orderStore.get(orderId);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }

        ReplenishmentOrder updated = new ReplenishmentOrder(
            order.id(),
            order.productId(),
            order.productName(),
            order.quantity(),
            order.totalCost(),
            newStatus,
            order.orderDate(),
            order.expectedArrival(),
            order.leadTimeDays(),
            newStatus == OrderStatus.RECEIVED ? LocalDateTime.now() : order.actualArrival(),
            order.trackingNumber()
        );

        orderStore.put(orderId, updated);

        log.info("Order status updated: orderId={}, status={}", orderId, newStatus);

        // 발주 완료 시 재고 증가
        if (newStatus == OrderStatus.RECEIVED) {
            receiveOrder(updated);
        }

        return updated;
    }

    /**
     * 발주 물품 입고 처리
     */
    @Transactional
    public void receiveOrder(ReplenishmentOrder order) {
        Product product = productRepository.findById(order.productId())
            .orElseThrow(() -> new IllegalArgumentException("Product not found: " + order.productId()));

        int currentStock = product.getStockQuantity();
        int newStock = currentStock + order.quantity();

        product.setStockQuantity(newStock);
        productRepository.save(product);

        log.info("Replenishment order received: productId={}, addedQuantity={}, currentStock={}, newStock={}",
                 order.productId(), order.quantity(), currentStock, newStock);
    }

    /**
     * 발주 취소
     */
    @Transactional
    public ReplenishmentOrder cancelOrder(Long orderId, String reason) {
        ReplenishmentOrder order = orderStore.get(orderId);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }

        if (order.status() == OrderStatus.RECEIVED) {
            throw new IllegalStateException("Cannot cancel received order");
        }

        ReplenishmentOrder cancelled = new ReplenishmentOrder(
            order.id(),
            order.productId(),
            order.productName(),
            order.quantity(),
            order.totalCost(),
            OrderStatus.CANCELLED,
            order.orderDate(),
            order.expectedArrival(),
            order.leadTimeDays(),
            order.actualArrival(),
            order.trackingNumber()
        );

        orderStore.put(orderId, cancelled);

        log.info("Order cancelled: orderId={}, reason={}", orderId, reason);

        return cancelled;
    }

    /**
     * 발주 조회
     */
    public Optional<ReplenishmentOrder> getOrder(Long orderId) {
        return Optional.ofNullable(orderStore.get(orderId));
    }

    /**
     * 제품별 발주 내역 조회
     */
    public java.util.List<ReplenishmentOrder> getOrdersByProduct(Long productId) {
        return orderStore.values().stream()
            .filter(order -> order.productId().equals(productId))
            .sorted((o1, o2) -> o2.orderDate().compareTo(o1.orderDate()))
            .toList();
    }

    /**
     * 상태별 발주 조회
     */
    public java.util.List<ReplenishmentOrder> getOrdersByStatus(OrderStatus status) {
        return orderStore.values().stream()
            .filter(order -> order.status() == status)
            .sorted((o1, o2) -> o2.orderDate().compareTo(o1.orderDate()))
            .toList();
    }

    /**
     * 지연된 발주 조회 (예상 도착일 초과)
     */
    public java.util.List<ReplenishmentOrder> getDelayedOrders() {
        LocalDateTime now = LocalDateTime.now();
        return orderStore.values().stream()
            .filter(order -> order.status() == OrderStatus.IN_TRANSIT || order.status() == OrderStatus.PENDING)
            .filter(order -> order.expectedArrival().isBefore(now))
            .sorted((o1, o2) -> o1.expectedArrival().compareTo(o2.expectedArrival()))
            .toList();
    }

    /**
     * 발주 통계 조회
     */
    public OrderStatistics getOrderStatistics() {
        long totalOrders = orderStore.size();
        long pendingOrders = orderStore.values().stream()
            .filter(o -> o.status() == OrderStatus.PENDING).count();
        long inTransitOrders = orderStore.values().stream()
            .filter(o -> o.status() == OrderStatus.IN_TRANSIT).count();
        long receivedOrders = orderStore.values().stream()
            .filter(o -> o.status() == OrderStatus.RECEIVED).count();
        long cancelledOrders = orderStore.values().stream()
            .filter(o -> o.status() == OrderStatus.CANCELLED).count();

        double totalCost = orderStore.values().stream()
            .filter(o -> o.status() == OrderStatus.RECEIVED)
            .mapToDouble(o -> o.totalCost().doubleValue())
            .sum();

        long delayedOrders = getDelayedOrders().size();

        double averageLeadTime = orderStore.values().stream()
            .filter(o -> o.status() == OrderStatus.RECEIVED && o.actualArrival() != null)
            .mapToLong(o -> java.time.Duration.between(o.orderDate(), o.actualArrival()).toDays())
            .average()
            .orElse(0.0);

        return new OrderStatistics(
            totalOrders,
            pendingOrders,
            inTransitOrders,
            receivedOrders,
            cancelledOrders,
            delayedOrders,
            totalCost,
            averageLeadTime
        );
    }

    /**
     * 발주 추적 번호 생성
     */
    private String generateTrackingNumber(Long productId) {
        return String.format("REP-%d-%d-%d",
            productId,
            System.currentTimeMillis(),
            (int)(Math.random() * 1000));
    }

    // Enums & Records

    public enum OrderStatus {
        PENDING("발주 대기"),
        IN_TRANSIT("배송 중"),
        RECEIVED("입고 완료"),
        CANCELLED("발주 취소");

        private final String description;

        OrderStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    public record ReplenishmentOrder(
        Long id,
        Long productId,
        String productName,
        int quantity,
        java.math.BigDecimal totalCost,
        OrderStatus status,
        LocalDateTime orderDate,
        LocalDateTime expectedArrival,
        int leadTimeDays,
        LocalDateTime actualArrival,
        String trackingNumber
    ) {
        public boolean isDelayed() {
            if (status == OrderStatus.RECEIVED || status == OrderStatus.CANCELLED) {
                return false;
            }
            return expectedArrival.isBefore(LocalDateTime.now());
        }

        public long getDaysUntilArrival() {
            return java.time.Duration.between(LocalDateTime.now(), expectedArrival).toDays();
        }

        public long getActualLeadTime() {
            if (actualArrival == null) {
                return 0;
            }
            return java.time.Duration.between(orderDate, actualArrival).toDays();
        }
    }

    public record OrderStatistics(
        long totalOrders,
        long pendingOrders,
        long inTransitOrders,
        long receivedOrders,
        long cancelledOrders,
        long delayedOrders,
        double totalCost,
        double averageLeadTime
    ) {}
}
