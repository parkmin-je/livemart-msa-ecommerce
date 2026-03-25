package com.livemart.order.application.handler;

import com.livemart.order.application.command.CreateOrderCommand;
import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderItem;
import com.livemart.order.domain.OrderStatus;
import com.livemart.order.domain.event.OrderCreatedEvent;
import com.livemart.order.repository.OrderRepository;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * 주문 생성 Command Handler (CQRS Command Side)
 *
 * 책임:
 * 1. Command 유효성 검증 (비즈니스 규칙)
 * 2. Order Aggregate 생성 (도메인 로직)
 * 3. 저장 (Write DB: MySQL/PostgreSQL)
 * 4. 도메인 이벤트 발행 (Kafka → 재고차감, 결제, 알림)
 *
 * @Observed: OpenTelemetry 자동 스팬 생성 (Spring AOP)
 *
 * 분리 원칙:
 * - 이 핸들러는 Command만 처리 (쓰기 전용)
 * - 주문 조회는 GetOrderQueryHandler가 담당 (읽기 전용)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CreateOrderCommandHandler {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 주문 생성 Command 처리
     *
     * 트랜잭션 범위:
     * - Order 저장까지만 포함
     * - 이벤트 발행은 트랜잭션 커밋 후 (TransactionalEventListener)
     */
    @Transactional
    @Observed(name = "order.create", contextualName = "createOrderCommand")
    public Order handle(CreateOrderCommand command) {
        log.info("주문 생성 처리 시작: userId={}, items={}개", command.userId(), command.items().size());

        // 1. 중복 주문 방지 (멱등성)
        String orderNumber = generateOrderNumber(command.userId());

        // 2. Order Aggregate 생성
        BigDecimal totalAmount = calculateTotal(command);

        Order order = Order.builder()
            .orderNumber(orderNumber)
            .userId(command.userId())
            .totalAmount(totalAmount)
            .status(OrderStatus.PENDING)
            .deliveryAddress(command.deliveryAddress())
            .phoneNumber(command.phoneNumber())
            .paymentMethod(command.paymentMethod())
            .orderNote(command.orderNote())
            .build();

        // 3. 주문 항목 추가
        command.items().forEach(itemCmd -> {
            OrderItem item = OrderItem.builder()
                .productId(itemCmd.productId())
                .quantity(itemCmd.quantity())
                .unitPrice(BigDecimal.valueOf(itemCmd.requestedPrice() != null ? itemCmd.requestedPrice() : 0L))
                .totalPrice(BigDecimal.valueOf(
                    (itemCmd.requestedPrice() != null ? itemCmd.requestedPrice() : 0L) * itemCmd.quantity()
                ))
                .order(order)
                .build();
            order.getItems().add(item);
        });

        // 4. Write DB 저장 (Command Side)
        Order saved = orderRepository.save(order);
        log.info("주문 저장 완료: orderId={}, orderNumber={}", saved.getId(), saved.getOrderNumber());

        // 5. 도메인 이벤트 발행 (Kafka로 전파)
        // @TransactionalEventListener(phase=AFTER_COMMIT)으로 처리하면 더 안전
        List<OrderCreatedEvent.OrderItemInfo> eventItems = command.items().stream()
            .map(i -> new OrderCreatedEvent.OrderItemInfo(
                i.productId(),
                "상품명",  // 실제에서는 상품 서비스에서 조회
                i.quantity(),
                BigDecimal.valueOf(i.requestedPrice() != null ? i.requestedPrice() : 0L),
                BigDecimal.valueOf((i.requestedPrice() != null ? i.requestedPrice() : 0L) * i.quantity())
            ))
            .toList();

        eventPublisher.publishEvent(
            OrderCreatedEvent.builder()
                .orderId(saved.getId())
                .orderNumber(saved.getOrderNumber())
                .userId(command.userId())
                .totalAmount(totalAmount)
                .paymentMethod(command.paymentMethod())
                .deliveryAddress(command.deliveryAddress())
                .items(eventItems)
                .build()
        );

        return saved;
    }

    private String generateOrderNumber(Long userId) {
        // 형식: ORD-{userId_prefix}-{UUID_short}
        String uuidPart = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return String.format("ORD-%s-%s", userId, uuidPart);
    }

    private BigDecimal calculateTotal(CreateOrderCommand command) {
        return command.items().stream()
            .map(item -> BigDecimal.valueOf(
                (item.requestedPrice() != null ? item.requestedPrice() : 0L) * item.quantity()
            ))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
