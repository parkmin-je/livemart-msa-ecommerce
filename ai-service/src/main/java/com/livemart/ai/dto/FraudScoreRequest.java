package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FraudScoreRequest {
    private Long orderId;
    private Long userId;
    private BigDecimal orderAmount;
    private Integer itemCount;
    private List<String> productCategories;
    private String shippingAddress;
    private Integer userOrderCount;        // 총 주문 수
    private Integer recentOrderCount;      // 최근 1시간 주문 수
    private Long accountAgeDays;
    private String paymentMethod;
}
