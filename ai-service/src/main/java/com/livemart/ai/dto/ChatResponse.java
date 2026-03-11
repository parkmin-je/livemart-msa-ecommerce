package com.livemart.ai.dto;

/**
 * CS 챗봇 응답 (비스트리밍)
 * 스트리밍은 /chat/stream 엔드포인트에서 SSE로 처리
 */
public record ChatResponse(
        String sessionId,
        String message,
        String intent,          // 감지된 의도: "order_inquiry" | "refund" | "product_info" | "general"
        boolean escalateToHuman // true이면 상담원 연결 권고
) {}
