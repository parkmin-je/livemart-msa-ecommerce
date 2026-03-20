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
public class SellerAgentResponse {
    private String productName;
    private String shortDescription;
    private String fullDescription;
    private String sellingPoint;
    private List<String> seoTags;
    private Double recommendedPrice;
    private String priceStrategy;
    private Integer recommendedStock;
    private Integer lowStockThreshold;
    private Double demandScore;        // 0.0~1.0
    private String marketInsight;
    private String agentLog;           // step-by-step what agent did
    private boolean demoMode;
}
