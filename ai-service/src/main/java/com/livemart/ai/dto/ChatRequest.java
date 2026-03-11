package com.livemart.ai.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/**
 * CS 챗봇 대화 요청
 */
public record ChatRequest(
        Long userId,
        @NotBlank String message,
        String sessionId,                   // 대화 세션 ID (히스토리 관리)
        List<ChatHistory> history,          // 이전 대화 이력 (최대 10턴)
        OrderContext orderContext            // 주문 컨텍스트 (선택)
) {
    public record ChatHistory(String role, String content) {}

    /** 주문 상태 컨텍스트 — 챗봇이 실시간 주문 데이터 참조 */
    public record OrderContext(
            String orderNumber,
            String status,
            String deliveryStatus,
            String expectedDelivery
    ) {}
}
