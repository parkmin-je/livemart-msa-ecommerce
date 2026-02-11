package com.livemart.order.repository;

import com.livemart.order.domain.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * N+1 문제 해결을 위한 커스텀 Repository
 * Fetch Join 및 EntityGraph 활용
 */
public interface OrderRepositoryCustom {

    /**
     * 주문 조회 with Fetch Join (N+1 방지)
     */
    Optional<Order> findByIdWithItems(Long orderId);

    /**
     * 사용자별 주문 목록 with Fetch Join (N+1 방지)
     */
    Page<Order> findByUserIdWithItems(Long userId, Pageable pageable);

    /**
     * 기간별 주문 통계 (단일 쿼리)
     */
    List<OrderStatistics> findOrderStatisticsByPeriod(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 주문 상태별 집계 (단일 쿼리)
     */
    List<OrderStatusCount> countOrdersByStatus();

    /**
     * Batch Insert를 위한 대량 주문 저장
     */
    void saveAllBatch(List<Order> orders);

    interface OrderStatistics {
        LocalDateTime getOrderDate();
        Long getOrderCount();
        Double getTotalAmount();
    }

    interface OrderStatusCount {
        String getStatus();
        Long getCount();
    }
}
