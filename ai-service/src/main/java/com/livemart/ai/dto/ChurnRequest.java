package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChurnRequest {
    private Long userId;
    private int totalOrders;
    private int daysSinceLastOrder;
    private double avgOrderAmount;
    private int cancelledOrders;
    private String topCategory;
    private int loginFrequencyPerMonth;
}
