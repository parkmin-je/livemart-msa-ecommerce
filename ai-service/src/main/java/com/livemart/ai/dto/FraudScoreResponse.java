package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FraudScoreResponse {
    private Long orderId;
    private int riskScore;           // 0-100
    private String riskLevel;        // LOW / MEDIUM / HIGH / CRITICAL
    private String action;           // APPROVE / REVIEW / BLOCK
    private String reasoning;
    private boolean demoMode;
}
