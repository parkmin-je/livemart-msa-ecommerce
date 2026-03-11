package com.livemart.ai.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/**
 * 판매자용 AI 상품 설명 생성 요청
 */
public record DescriptionRequest(
        @NotBlank String productName,
        String category,
        List<String> keywords,          // 핵심 키워드 (예: "방수", "가벼운", "프리미엄")
        Integer targetPrice,            // 가격대 (원)
        String targetAudience,          // 타겟 고객층
        String tone                     // 어조: "professional" | "casual" | "luxury"
) {
    public DescriptionRequest {
        if (tone == null) tone = "professional";
    }
}
