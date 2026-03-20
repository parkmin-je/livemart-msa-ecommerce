package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReplenishmentRequest {
    private Long productId;
    private String productName;
    private int currentStock;
    private double dailyAvgSales;
    private int leadTimeDays;
    private String trend; // RISING / STABLE / DECLINING
}
