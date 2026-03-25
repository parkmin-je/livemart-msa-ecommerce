package com.livemart.order.domain.repository;

import com.livemart.order.domain.model.OrderId;
import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 주문 도메인 리포지토리 인터페이스 (DDD Repository Pattern)
 *
 * 도메인 계층에 위치하며, 인프라스트럭처(JPA)에 대한 의존성 없음.
 * 실제 구현체는 infrastructure 계층 (JPA Adapter)에서 제공.
 *
 * 원칙:
 * - 도메인 개념(Order, OrderId)만 사용, JPA Entity 노출 금지
 * - findAll/페이징은 Query 전용 리포지토리에서 처리 (CQRS 분리)
 * - Command side: 단일 Aggregate 저장/조회만 담당
 */
public interface OrderDomainRepository {

    /**
     * 주문 저장 (생성 또는 갱신)
     * 도메인 이벤트는 저장 전 수집하여 트랜잭션 커밋 후 발행
     */
    Order save(Order order);

    /**
     * 주문 ID로 조회 (비관적 잠금 옵션)
     */
    Optional<Order> findById(OrderId orderId);

    /**
     * 주문번호로 조회 (고객 주문번호는 orderNumber, DB PK는 id)
     */
    Optional<Order> findByOrderNumber(String orderNumber);

    /**
     * 주문 존재 여부 확인 (중복 주문 방지)
     */
    boolean existsByOrderNumber(String orderNumber);

    /**
     * 취소 가능한 주문 목록 (배치 취소 처리)
     */
    List<Order> findCancellableOrdersBefore(LocalDateTime cutoffTime);

    /**
     * 사용자의 최근 주문 수 조회 (Rate Limiting: 일일 주문 한도 체크)
     */
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime from);
}
