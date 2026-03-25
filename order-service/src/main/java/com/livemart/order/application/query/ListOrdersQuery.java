package com.livemart.order.application.query;

import com.livemart.order.domain.OrderStatus;

import java.time.LocalDate;

/**
 * 주문 목록 조회 Query
 *
 * 페이징, 필터링, 정렬 조건을 포함.
 * Query side에서 Redis/Elasticsearch 활용하여 고성능 읽기 처리.
 */
public record ListOrdersQuery(
    Long userId,           // null이면 전체 (ADMIN 전용)
    OrderStatus status,    // null이면 전체 상태
    LocalDate startDate,
    LocalDate endDate,
    int page,
    int size,
    String sort,           // "createdAt,desc" 형식
    Long requesterId,
    String requesterRole
) {}
