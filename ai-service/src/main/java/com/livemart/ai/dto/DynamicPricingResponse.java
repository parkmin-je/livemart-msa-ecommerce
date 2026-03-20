package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DynamicPricingResponse {
    private Long productId;
    private double recommendedPrice;
    private double minPrice;
    private double maxPrice;
    private String strategy;            // PENETRATION / PREMIUM / COMPETITIVE / CLEARANCE
    private String reasoning;
    private double expectedRevenueLift; // %
    private boolean demoMode;
}
