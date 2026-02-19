package com.livemart.order.service;

import com.livemart.order.aspect.DistributedLock;
import com.livemart.order.client.PaymentFeignClient;
import com.livemart.order.client.ProductFeignClient;
import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderItem;
import com.livemart.order.domain.OrderStatus;
import com.livemart.order.dto.*;
import com.livemart.order.event.OrderEvent;
import com.livemart.common.event.DomainEvent;
import com.livemart.common.event.EventPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.livemart.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
@Slf4j
public class OrderService {
    private final OrderRepository orderRepository;
    private final ProductFeignClient productFeignClient;
    private final PaymentFeignClient paymentFeignClient;
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;
    private final EventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public OrderService(OrderRepository orderRepository,
                       ProductFeignClient productFeignClient,
                       PaymentFeignClient paymentFeignClient,
                       KafkaTemplate<String, OrderEvent> kafkaTemplate,
                       java.util.Optional<EventPublisher> eventPublisher,
                       java.util.Optional<ObjectMapper> objectMapper) {
        this.orderRepository = orderRepository;
        this.productFeignClient = productFeignClient;
        this.paymentFeignClient = paymentFeignClient;
        this.kafkaTemplate = kafkaTemplate;
        this.eventPublisher = eventPublisher.orElse(null);
        this.objectMapper = objectMapper.orElse(new com.fasterxml.jackson.databind.ObjectMapper());
    }

    private static final String ORDER_TOPIC = "order-events";

    @DistributedLock(key = "#request.items[0].productId", waitTime = 10, leaseTime = 5)
    public OrderResponse createOrder(OrderCreateRequest request) {
        return createOrderInternal(request);
    }

    @Transactional
    protected OrderResponse createOrderInternal(OrderCreateRequest request) {
        Long userId = request.getUserId();
        log.info("Creating order for userId: {}", userId);

        // 1. 상품 정보 조회 및 검증 (락 사용)
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemRequest itemRequest : request.getItems()) {
            ProductInfo product = productFeignClient.getProductWithLock(itemRequest.getProductId());

            if (product.getStockQuantity() < itemRequest.getQuantity()) {
                throw new RuntimeException("재고가 부족합니다: " + product.getName());
            }

            BigDecimal itemTotal = product.getPrice().multiply(new BigDecimal(itemRequest.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            OrderItem orderItem = OrderItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .productPrice(product.getPrice())
                    .quantity(itemRequest.getQuantity())
                    .totalPrice(itemTotal)
                    .build();

            orderItems.add(orderItem);
        }

        // 2. 주문 생성
        String orderNumber = generateOrderNumber();
        Order order = Order.builder()
                .orderNumber(orderNumber)
                .userId(userId)
                .totalAmount(totalAmount)
                .status(OrderStatus.PENDING)
                .deliveryAddress(request.getDeliveryAddress())
                .phoneNumber(request.getPhoneNumber())
                .orderNote(request.getOrderNote())
                .paymentMethod(request.getPaymentMethod())
                .build();

        for (OrderItem item : orderItems) {
            order.addOrderItem(item);
        }

        orderRepository.save(order);

        // 3. 재고 차감
        try {
            for (OrderItemRequest itemRequest : request.getItems()) {
                ProductInfo product = productFeignClient.getProduct(itemRequest.getProductId());
                int newStock = product.getStockQuantity() - itemRequest.getQuantity();
                productFeignClient.updateStock(itemRequest.getProductId(), newStock);
            }
        } catch (Exception e) {
            log.error("Failed to update stock. Rolling back order: {}", orderNumber, e);
            orderRepository.delete(order);
            throw new RuntimeException("재고 업데이트 실패. 주문이 취소되었습니다.");
        }

        // 4. 결제 처리
        // Payment Service의 PaymentMethod Enum 값으로 변환
        String paymentMethod = request.getPaymentMethod();
        if ("CARD".equals(paymentMethod)) {
            paymentMethod = "CREDIT_CARD";  // Payment Service 호환성
        }

        PaymentRequest paymentRequest = PaymentRequest.builder()
                .orderNumber(order.getOrderNumber())
                .userId(userId)
                .amount(totalAmount)
                .paymentMethod(paymentMethod)
                .build();

        try {
            PaymentResponse paymentResponse = paymentFeignClient.processPayment(paymentRequest);
            order.setPaymentTransactionId(paymentResponse.getTransactionId());
            log.info("결제 완료: transactionId={}", paymentResponse.getTransactionId());
        } catch (Exception e) {
            log.error("결제 실패. 주문 롤백: {}", order.getOrderNumber(), e);
            orderRepository.delete(order);
            throw new RuntimeException("결제 처리 실패");
        }

        // 5. 주문 이벤트 발행
        publishOrderEvent(order, OrderEvent.EventType.ORDER_CREATED, null);

        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다."));
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getUserOrders(Long userId) {
        return orderRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    private String generateOrderNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%08X", new Random().nextInt());
        return "ORD-" + timestamp + "-" + random;
    }

    private void publishOrderEvent(Order order, OrderEvent.EventType eventType, String cancelReason) {
        List<OrderEvent.OrderItemInfo> items = order.getItems().stream()
                .map(item -> OrderEvent.OrderItemInfo.builder()
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .price(item.getProductPrice())
                        .build())
                .toList();

        OrderEvent event = OrderEvent.builder()
                .eventType(eventType)
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .items(items)
                .occurredAt(LocalDateTime.now())
                .cancelReason(cancelReason)
                .build();

        // Transactional Outbox 패턴으로 이벤트 발행 (DB에 먼저 저장 후 비동기 Kafka 전송)
        if (eventPublisher != null) {
            try {
                String payload = objectMapper.writeValueAsString(event);
                DomainEvent domainEvent = DomainEvent.builder()
                        .aggregateType("Order")
                        .aggregateId(order.getOrderNumber())
                        .eventType(eventType.name())
                        .payload(payload)
                        .build();
                eventPublisher.publish(ORDER_TOPIC, domainEvent);
                log.info("Order event published via Outbox: eventType={}, orderNumber={}", eventType, order.getOrderNumber());
            } catch (Exception e) {
                log.warn("Outbox publish failed, falling back to direct Kafka: {}", e.getMessage());
                kafkaTemplate.send(ORDER_TOPIC, order.getOrderNumber(), event);
                log.info("Order event published directly: eventType={}, orderNumber={}", eventType, order.getOrderNumber());
            }
        } else {
            // EventPublisher가 없으면 직접 Kafka로 발행
            kafkaTemplate.send(ORDER_TOPIC, order.getOrderNumber(), event);
            log.info("Order event published directly via Kafka: eventType={}, orderNumber={}", eventType, order.getOrderNumber());
        }
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .productPrice(item.getProductPrice())
                        .quantity(item.getQuantity())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .toList();

        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .items(items)
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .deliveryAddress(order.getDeliveryAddress())
                .phoneNumber(order.getPhoneNumber())
                .orderNote(order.getOrderNote())
                .paymentMethod(order.getPaymentMethod())
                .paymentTransactionId(order.getPaymentTransactionId())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .confirmedAt(order.getConfirmedAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .cancelledAt(order.getCancelledAt())
                .build();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByOrderNumber(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다."));
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getOrdersByUserId(Long userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getOrdersByStatus(OrderStatus status, Pageable pageable) {
        return orderRepository.findByStatus(status, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다."));
        order.confirm();
        publishOrderEvent(order, OrderEvent.EventType.ORDER_CONFIRMED, null);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse shipOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다."));
        order.ship();
        publishOrderEvent(order, OrderEvent.EventType.ORDER_SHIPPED, null);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse deliverOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다."));
        order.deliver();
        publishOrderEvent(order, OrderEvent.EventType.ORDER_DELIVERED, null);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, String reason) {
        log.info("Cancelling order: orderId={}, reason={}", orderId, reason);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다."));

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new RuntimeException("취소할 수 없는 주문 상태입니다: " + order.getStatus());
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new RuntimeException("이미 취소된 주문입니다.");
        }

        try {
            // 1. 결제 취소
            if (order.getPaymentTransactionId() != null) {
                paymentFeignClient.cancelPayment(order.getPaymentTransactionId(), Map.of("reason", reason));
                log.info("Payment cancelled: transactionId={}", order.getPaymentTransactionId());
            }

            // 2. 주문 상태 변경
            order.cancel();

            // 3. 취소 이벤트 발행 (재고 복구는 Product Service에서 이벤트 수신 후 처리)
            publishOrderEvent(order, OrderEvent.EventType.ORDER_CANCELLED, reason);

            log.info("Order cancelled successfully: orderId={}, orderNumber={}", orderId, order.getOrderNumber());
            return toResponse(order);

        } catch (Exception e) {
            log.error("Failed to cancel order: orderId={}", orderId, e);
            throw new RuntimeException("주문 취소에 실패했습니다: " + e.getMessage());
        }
    }
}