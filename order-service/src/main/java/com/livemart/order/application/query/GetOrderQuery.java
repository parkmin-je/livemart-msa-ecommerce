package com.livemart.order.application.query;

/**
 * 단일 주문 조회 Query (CQRS Query 객체)
 *
 * Query 특성:
 * - 시스템 상태를 변경하지 않음 (읽기 전용)
 * - Read Model(Redis 캐시, Elasticsearch)에서 처리
 * - Command와 분리된 핸들러에서 처리
 */
public record GetOrderQuery(
    Long orderId,
    String orderNumber,  // orderId 또는 orderNumber 중 하나만 사용
    Long requesterId,
    String requesterRole  // USER(본인것만), ADMIN(전체), SELLER(본인 상품 주문만)
) {

    public boolean isById() {
        return orderId != null;
    }

    public boolean isByOrderNumber() {
        return orderNumber != null && !orderNumber.isBlank();
    }
}
