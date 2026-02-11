package com.livemart.product.controller;

import com.livemart.product.inventory.AutoReplenishmentService;
import com.livemart.product.inventory.ReplenishmentOrderService;
import com.livemart.product.inventory.ReplenishmentOrderService.OrderStatistics;
import com.livemart.product.inventory.ReplenishmentOrderService.OrderStatus;
import com.livemart.product.inventory.ReplenishmentOrderService.ReplenishmentOrder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 재고 발주 관리 API
 */
@RestController
@RequestMapping("/api/v1/replenishment")
@RequiredArgsConstructor
public class ReplenishmentController {

    private final ReplenishmentOrderService replenishmentOrderService;
    private final AutoReplenishmentService autoReplenishmentService;

    /**
     * 수동 발주 생성
     */
    @PostMapping("/orders")
    public ResponseEntity<ReplenishmentOrder> createOrder(
            @RequestBody CreateOrderRequest request) {

        ReplenishmentOrder order = replenishmentOrderService.createOrder(
            request.productId(),
            request.quantity(),
            request.leadTimeDays()
        );

        return ResponseEntity.ok(order);
    }

    /**
     * 발주 상태 업데이트
     */
    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<ReplenishmentOrder> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestParam OrderStatus status) {

        ReplenishmentOrder updated = replenishmentOrderService.updateOrderStatus(orderId, status);
        return ResponseEntity.ok(updated);
    }

    /**
     * 발주 취소
     */
    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<ReplenishmentOrder> cancelOrder(
            @PathVariable Long orderId,
            @RequestParam(required = false) String reason) {

        ReplenishmentOrder cancelled = replenishmentOrderService.cancelOrder(orderId, reason);
        return ResponseEntity.ok(cancelled);
    }

    /**
     * 발주 조회
     */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<ReplenishmentOrder> getOrder(@PathVariable Long orderId) {
        return replenishmentOrderService.getOrder(orderId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 제품별 발주 내역
     */
    @GetMapping("/orders/product/{productId}")
    public ResponseEntity<List<ReplenishmentOrder>> getOrdersByProduct(@PathVariable Long productId) {
        List<ReplenishmentOrder> orders = replenishmentOrderService.getOrdersByProduct(productId);
        return ResponseEntity.ok(orders);
    }

    /**
     * 상태별 발주 조회
     */
    @GetMapping("/orders")
    public ResponseEntity<List<ReplenishmentOrder>> getOrdersByStatus(
            @RequestParam(required = false) OrderStatus status) {

        if (status != null) {
            return ResponseEntity.ok(replenishmentOrderService.getOrdersByStatus(status));
        }

        // 모든 발주 조회 로직은 별도 구현 필요
        return ResponseEntity.ok(List.of());
    }

    /**
     * 지연된 발주 조회
     */
    @GetMapping("/orders/delayed")
    public ResponseEntity<List<ReplenishmentOrder>> getDelayedOrders() {
        List<ReplenishmentOrder> delayed = replenishmentOrderService.getDelayedOrders();
        return ResponseEntity.ok(delayed);
    }

    /**
     * 발주 통계
     */
    @GetMapping("/statistics")
    public ResponseEntity<OrderStatistics> getStatistics() {
        OrderStatistics stats = replenishmentOrderService.getOrderStatistics();
        return ResponseEntity.ok(stats);
    }

    /**
     * 자동 발주 즉시 실행 (테스트용)
     */
    @PostMapping("/auto-replenish/trigger")
    public ResponseEntity<String> triggerAutoReplenishment() {
        autoReplenishmentService.checkAndReplenishStock();
        return ResponseEntity.ok("Auto replenishment triggered successfully");
    }

    /**
     * EOQ 계산
     */
    @PostMapping("/calculate/eoq")
    public ResponseEntity<EoqResponse> calculateEOQ(@RequestBody EoqRequest request) {
        int eoq = autoReplenishmentService.calculateEOQ(
            null, // Product는 실제로 EOQ 계산에 필요하지 않음
            request.annualDemand(),
            request.orderCost(),
            request.holdingCost()
        );

        double totalCost = calculateTotalInventoryCost(
            request.annualDemand(),
            eoq,
            request.orderCost(),
            request.holdingCost()
        );

        int orderFrequency = (int) Math.ceil(request.annualDemand() / eoq);

        return ResponseEntity.ok(new EoqResponse(
            eoq,
            totalCost,
            orderFrequency,
            request.annualDemand() / 365.0
        ));
    }

    /**
     * Safety Stock 계산
     */
    @PostMapping("/calculate/safety-stock")
    public ResponseEntity<SafetyStockResponse> calculateSafetyStock(
            @RequestBody SafetyStockRequest request) {

        int safetyStock = autoReplenishmentService.calculateSafetyStock(
            request.avgDailyDemand(),
            request.leadTimeDays(),
            request.serviceLevel()
        );

        int reorderPoint = autoReplenishmentService.calculateReorderPoint(
            request.avgDailyDemand(),
            request.leadTimeDays(),
            safetyStock
        );

        return ResponseEntity.ok(new SafetyStockResponse(
            safetyStock,
            reorderPoint,
            request.serviceLevel() * 100
        ));
    }

    // Helper Methods

    private double calculateTotalInventoryCost(double annualDemand, int orderQuantity,
                                                double orderCost, double holdingCost) {
        double orderingCost = (annualDemand / orderQuantity) * orderCost;
        double holdingCostTotal = (orderQuantity / 2.0) * holdingCost;
        return orderingCost + holdingCostTotal;
    }

    // Request/Response DTOs

    public record CreateOrderRequest(
        Long productId,
        int quantity,
        int leadTimeDays
    ) {}

    public record EoqRequest(
        double annualDemand,
        double orderCost,
        double holdingCost
    ) {}

    public record EoqResponse(
        int economicOrderQuantity,
        double totalCost,
        int orderFrequency,
        double avgDailyDemand
    ) {}

    public record SafetyStockRequest(
        double avgDailyDemand,
        double leadTimeDays,
        double serviceLevel
    ) {}

    public record SafetyStockResponse(
        int safetyStock,
        int reorderPoint,
        double serviceLevel
    ) {}
}
