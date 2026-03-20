package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandForecastRequest {
    private Long productId;
    private String productName;
    private String category;
    private List<Integer> weeklySales;  // 최근 8주 주간 판매량
    private int currentStock;
    private double currentPrice;
}
