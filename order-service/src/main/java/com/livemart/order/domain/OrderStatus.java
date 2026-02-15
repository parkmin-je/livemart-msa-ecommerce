package com.livemart.order.domain;

public enum OrderStatus {
    PENDING,      // 주문 생성
    CONFIRMED,    // 결제 완료
    SHIPPED,      // 배송 시작
    DELIVERED,    // 배송 완료
    CANCELLED,    // 주문 취소
    RETURN_REQUESTED,  // 반품 요청
    RETURNED,     // 반품 완료
    REFUNDED      // 환불 완료
}