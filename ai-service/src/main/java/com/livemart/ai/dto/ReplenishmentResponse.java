package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReplenishmentResponse {
    private Long productId;
    private boolean shouldReorder;
    private String urgency;         // CRITICAL / HIGH / MEDIUM / LOW
    private int recommendedQuantity;
    private int reorderPoint;
    private int estimatedStockoutDays;
    private String reasoning;
    private boolean demoMode;
}
