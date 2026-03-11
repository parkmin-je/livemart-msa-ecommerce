package com.livemart.ai.dto;

import java.util.List;

/**
 * AI 상품 추천 응답
 */
public record RecommendationResponse(
        Long userId,
        List<RecommendedItem> recommendations,
        String reasoning,           // LLM이 추천한 이유 요약
        boolean cached,             // Redis 캐시에서 반환 여부
        long latencyMs
) {
    public record RecommendedItem(
            String productName,
            String category,
            String reason,          // 개별 추천 이유
            double relevanceScore   // 0.0 ~ 1.0
    ) {}
}
