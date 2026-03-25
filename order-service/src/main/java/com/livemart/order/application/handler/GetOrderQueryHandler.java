package com.livemart.order.application.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.order.application.query.GetOrderQuery;
import com.livemart.order.application.query.ListOrdersQuery;
import com.livemart.order.domain.Order;
import com.livemart.order.dto.OrderResponse;
import com.livemart.order.repository.OrderRepository;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Optional;

/**
 * 주문 조회 Query Handler (CQRS Query Side)
 *
 * Read Model 전략:
 * 1. Redis 캐시 확인 (L1)
 * 2. 미스 시 Read DB 조회 (L2) — 실제로는 Read Replica
 * 3. 결과를 Redis에 캐싱
 *
 * Write Model과 분리:
 * - 이 핸들러는 데이터 변경 없음 (@Transactional(readOnly=true))
 * - Read DB가 Write DB와 물리적으로 분리 가능 (RDS Read Replica)
 *
 * 장기 목표:
 * - Elasticsearch를 Read Model로 사용 (전문 검색, 집계 지원)
 * - Event-driven Projection으로 실시간 Read Model 갱신
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GetOrderQueryHandler {

    private static final String CACHE_PREFIX = "order:read:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private final OrderRepository orderRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 단일 주문 조회 (캐시 우선)
     */
    @Transactional(readOnly = true)
    @Observed(name = "order.query.get", contextualName = "getOrderQuery")
    public Optional<OrderResponse> handle(GetOrderQuery query) {
        String cacheKey = buildCacheKey(query);

        // 1. Redis Read Model 확인
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.debug("주문 캐시 히트: key={}", cacheKey);
            try {
                return Optional.of(objectMapper.convertValue(cached, OrderResponse.class));
            } catch (Exception e) {
                log.warn("캐시 역직렬화 실패, DB 재조회: {}", e.getMessage());
            }
        }

        // 2. DB 조회 (Read Replica 또는 Write DB)
        Optional<Order> orderOpt;
        if (query.isById()) {
            orderOpt = orderRepository.findById(query.orderId());
        } else if (query.isByOrderNumber()) {
            orderOpt = orderRepository.findByOrderNumber(query.orderNumber());
        } else {
            return Optional.empty();
        }

        if (orderOpt.isEmpty()) {
            return Optional.empty();
        }

        Order order = orderOpt.get();

        // 3. 접근 권한 검증
        if ("USER".equals(query.requesterRole()) &&
            !order.getUserId().equals(query.requesterId())) {
            log.warn("주문 접근 거부: orderId={}, requesterId={}", query.orderId(), query.requesterId());
            return Optional.empty();
        }

        // 4. Read Model DTO 변환
        OrderResponse response = OrderResponse.from(order);

        // 5. Redis Read Model 갱신 (캐시 업데이트)
        try {
            redisTemplate.opsForValue().set(cacheKey, response, CACHE_TTL);
        } catch (Exception e) {
            log.warn("주문 캐시 갱신 실패 (무시): {}", e.getMessage());
        }

        return Optional.of(response);
    }

    /**
     * 주문 목록 조회
     * 실제 운영에서는 Elasticsearch Query로 대체하여 고성능 검색 지원
     */
    @Transactional(readOnly = true)
    @Observed(name = "order.query.list", contextualName = "listOrdersQuery")
    public Page<OrderResponse> handle(ListOrdersQuery query) {
        PageRequest pageRequest = PageRequest.of(query.page(), query.size());

        // USER는 본인 주문만 조회
        Long effectiveUserId = "USER".equals(query.requesterRole())
            ? query.requesterId()
            : query.userId();

        if (effectiveUserId != null) {
            return orderRepository.findByUserId(effectiveUserId, pageRequest)
                .map(OrderResponse::from);
        }

        // ADMIN은 전체 조회
        return orderRepository.findAll(pageRequest).map(OrderResponse::from);
    }

    /**
     * Read Model 캐시 무효화 (주문 상태 변경 시 호출)
     */
    public void evictCache(Long orderId, String orderNumber) {
        if (orderId != null) {
            redisTemplate.delete(CACHE_PREFIX + "id:" + orderId);
        }
        if (orderNumber != null) {
            redisTemplate.delete(CACHE_PREFIX + "num:" + orderNumber);
        }
        log.debug("주문 캐시 무효화: orderId={}, orderNumber={}", orderId, orderNumber);
    }

    private String buildCacheKey(GetOrderQuery query) {
        if (query.isById()) {
            return CACHE_PREFIX + "id:" + query.orderId();
        }
        return CACHE_PREFIX + "num:" + query.orderNumber();
    }
}
