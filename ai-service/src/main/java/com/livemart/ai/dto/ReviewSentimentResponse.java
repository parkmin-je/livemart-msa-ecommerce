package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Map;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSentimentResponse {
    private Long reviewId;
    private String sentiment;           // POSITIVE / NEGATIVE / NEUTRAL
    private double sentimentScore;      // 0.0~1.0
    private String moderationAction;    // PUBLISH / FLAG / REJECT
    private String moderationReason;
    private Map<String, String> aspects; // quality/delivery/value → positive/negative/neutral
    private double helpfulnessScore;    // 0.0~1.0
    private boolean demoMode;
}
