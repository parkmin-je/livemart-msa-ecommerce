package com.livemart.order.application.command;

import com.livemart.order.domain.OrderStatus;
import jakarta.validation.constraints.NotNull;

/**
 * 주문 상태 변경 Command
 *
 * 상태 전환 규칙은 Order Aggregate 내에서 검증됨.
 * PENDING → CONFIRMED → SHIPPED → DELIVERED
 *         → CANCELLED
 */
public record UpdateOrderStatusCommand(

    @NotNull Long orderId,
    @NotNull OrderStatus targetStatus,
    @NotNull Long updaterId,
    @NotNull String updaterRole,  // SYSTEM, SELLER, ADMIN

    // 배송 시작 시 필요
    String trackingNumber,
    String courierCode

) {}
