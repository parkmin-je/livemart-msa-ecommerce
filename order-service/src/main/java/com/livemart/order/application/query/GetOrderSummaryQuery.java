package com.livemart.order.application.query;

import java.time.LocalDate;

/**
 * 주문 요약 통계 Query (CQRS Read Model 전용)
 *
 * 주문 요약 대시보드 (Admin/Seller):
 * - 기간별 주문 수, 총 매출, 평균 주문 금액
 * - 상태별 주문 분포
 * - 취소율, 반품율
 *
 * Read Model: Elasticsearch Aggregation 또는 Redis Sorted Set 활용
 */
public record GetOrderSummaryQuery(
    Long sellerId,         // Seller 대시보드 (null이면 전체)
    LocalDate startDate,
    LocalDate endDate,
    String granularity,    // DAILY, WEEKLY, MONTHLY
    Long requesterId,
    String requesterRole
) {}
