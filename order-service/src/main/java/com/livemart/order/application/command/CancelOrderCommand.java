package com.livemart.order.application.command;

import jakarta.validation.constraints.NotNull;

/**
 * 주문 취소 Command
 *
 * cancelledBy: 취소 요청자 (USER, SELLER, ADMIN, SYSTEM)
 */
public record CancelOrderCommand(

    @NotNull Long orderId,
    @NotNull Long requesterId,
    @NotNull String requesterRole,  // USER, SELLER, ADMIN, SYSTEM
    @NotNull String cancelReason

) {}
