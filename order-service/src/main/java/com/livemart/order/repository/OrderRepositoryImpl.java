package com.livemart.order.repository;

import com.livemart.order.domain.Order;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * N+1 쿼리 문제 해결 구현체
 * JPQL Fetch Join 및 최적화된 쿼리 사용
 */
@Repository
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepositoryCustom {

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    public Optional<Order> findByIdWithItems(Long orderId) {
        String jpql = """
            SELECT DISTINCT o FROM Order o
            LEFT JOIN FETCH o.items
            WHERE o.id = :orderId
            """;

        List<Order> results = entityManager.createQuery(jpql, Order.class)
            .setParameter("orderId", orderId)
            .getResultList();

        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public Page<Order> findByUserIdWithItems(Long userId, Pageable pageable) {
        // Count query (성능 최적화)
        String countJpql = "SELECT COUNT(DISTINCT o) FROM Order o WHERE o.userId = :userId";
        Long total = entityManager.createQuery(countJpql, Long.class)
            .setParameter("userId", userId)
            .getSingleResult();

        // Fetch join query
        String jpql = """
            SELECT DISTINCT o FROM Order o
            LEFT JOIN FETCH o.items
            WHERE o.userId = :userId
            ORDER BY o.createdAt DESC
            """;

        List<Order> orders = entityManager.createQuery(jpql, Order.class)
            .setParameter("userId", userId)
            .setFirstResult((int) pageable.getOffset())
            .setMaxResults(pageable.getPageSize())
            .getResultList();

        return new PageImpl<>(orders, pageable, total);
    }

    @Override
    public List<OrderStatistics> findOrderStatisticsByPeriod(LocalDateTime startDate, LocalDateTime endDate) {
        String jpql = """
            SELECT
                DATE(o.createdAt) as orderDate,
                COUNT(o.id) as orderCount,
                SUM(o.totalAmount) as totalAmount
            FROM Order o
            WHERE o.createdAt BETWEEN :startDate AND :endDate
            GROUP BY DATE(o.createdAt)
            ORDER BY DATE(o.createdAt)
            """;

        return entityManager.createQuery(jpql, OrderStatistics.class)
            .setParameter("startDate", startDate)
            .setParameter("endDate", endDate)
            .getResultList();
    }

    @Override
    public List<OrderStatusCount> countOrdersByStatus() {
        String jpql = """
            SELECT
                o.status as status,
                COUNT(o.id) as count
            FROM Order o
            GROUP BY o.status
            """;

        return entityManager.createQuery(jpql, OrderStatusCount.class)
            .getResultList();
    }

    @Override
    public void saveAllBatch(List<Order> orders) {
        int batchSize = 50;
        for (int i = 0; i < orders.size(); i++) {
            entityManager.persist(orders.get(i));
            if (i % batchSize == 0 && i > 0) {
                entityManager.flush();
                entityManager.clear();
            }
        }
        entityManager.flush();
        entityManager.clear();
    }
}
