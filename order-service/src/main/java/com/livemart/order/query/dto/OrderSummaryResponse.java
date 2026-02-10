package com.livemart.order.query.dto;

import com.livemart.order.domain.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * CQRS Query 모델 - 주문 요약 (읽기 전용, 경량)
 */
@Getter
@Builder
@AllArgsConstructor
public class OrderSummaryResponse {
    private Long id;
    private String orderNumber;
    private Long userId;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private int itemCount;
    private String paymentMethod;
    private LocalDateTime createdAt;
}
