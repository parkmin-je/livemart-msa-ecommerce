package com.livemart.ai.dto;

/**
 * AI 상품 설명 생성 응답
 */
public record DescriptionResponse(
        String productName,
        String shortDescription,    // 한 줄 설명 (검색 결과용)
        String fullDescription,     // 상세 페이지용 본문
        String sellingPoint,        // 핵심 판매 포인트
        String[] tags,              // SEO 태그
        long latencyMs
) {}
