package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandForecastResponse {
    private Long productId;
    private int forecastNextWeek;
    private int forecastNextMonth;
    private int recommendedReorderPoint;
    private int recommendedOrderQuantity;
    private String trend;               // RISING / STABLE / DECLINING
    private double confidenceScore;
    private String insight;
    private boolean demoMode;
}
