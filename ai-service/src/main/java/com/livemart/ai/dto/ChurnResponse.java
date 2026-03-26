package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChurnResponse {
    private Long userId;
    private int churnScore;             // 0-100
    private String churnRisk;           // LOW / MEDIUM / HIGH
    private String retentionAction;     // COUPON / RECOMMENDATION / EMAIL / NONE
    private String retentionMessage;    // 맞춤 메시지
    private boolean demoMode;
}
