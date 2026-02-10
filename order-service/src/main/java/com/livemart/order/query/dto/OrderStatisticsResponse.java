package com.livemart.order.query.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * CQRS Query 모델 - 주문 통계 (읽기 전용)
 */
@Getter
@Builder
@AllArgsConstructor
public class OrderStatisticsResponse {
    private long totalOrders;
    private long pendingOrders;
    private long confirmedOrders;
    private long shippedOrders;
    private long deliveredOrders;
    private long cancelledOrders;
    private BigDecimal totalRevenue;
    private BigDecimal averageOrderAmount;
}
