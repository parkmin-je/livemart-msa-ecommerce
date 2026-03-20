package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DynamicPricingRequest {
    private Long productId;
    private String productName;
    private String category;
    private double currentPrice;
    private int currentStock;
    private int soldLast7Days;
    private double avgCompetitorPrice;
    private double costPrice;
}
