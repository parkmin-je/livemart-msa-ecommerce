package com.livemart.ai.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * 상품 추천 요청
 */
public record RecommendationRequest(
        @NotNull Long userId,
        List<Long> purchasedProductIds,      // 구매 이력 상품 ID
        List<String> purchasedCategories,     // 구매 이력 카테고리
        List<String> availableProductNames,   // 현재 판매 중인 상품명 (최대 50개)
        Integer count                         // 추천 개수 (기본값 5)
) {
    public RecommendationRequest {
        if (count == null) count = 5;
    }
}
