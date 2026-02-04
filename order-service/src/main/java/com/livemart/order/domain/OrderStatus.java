package com.livemart.order.domain;

public enum OrderStatus {
    PENDING,      // 주문 생성
    CONFIRMED,    // 결제 완료
    SHIPPED,      // 배송 시작
    DELIVERED,    // 배송 완료
    CANCELLED     // 주문 취소
}