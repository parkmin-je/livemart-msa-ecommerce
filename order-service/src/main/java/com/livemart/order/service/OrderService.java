package com.livemart.order.service;

import com.livemart.order.client.ProductServiceClient;
import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderItem;
import com.livemart.order.domain.OrderStatus;
import com.livemart.order.dto.*;
import com.livemart.order.event.OrderEvent;
import com.livemart.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductServiceClient productServiceClient;
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    private static final String ORDER_TOPIC = "order-events";

    /**
     * 주문 생성 (Saga Pattern - Orchestration)
     * 1. 상품 정보 조회
     * 2. 재고 검증
     * 3. 주문 생성
     * 4. 재고 차감
     * 5. 이벤트 발행
     */
    @Transactional
    public OrderResponse createOrder(OrderCreateRequest request) {
        log.info("Creating order for userId: {}", request.getUserId());

        // Step 1: 상품 정보 조회 및 검증
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemRequest itemRequest : request.getItems()) {
            // Product Service 호출 (Circuit Breaker 적용)
            ProductInfo productInfo = productServiceClient.getProductInfo(itemRequest.getProductId());

            // 재고 검증
            if (productInfo.getStockQuantity() < itemRequest.getQuantity()) {
                throw new IllegalStateException(
                        String.format("상품 '%s'의 재고가 부족합니다. (요청: %d, 재고: %d)",
                                productInfo.getName(),
                                itemRequest.getQuantity(),
                                productInfo.getStockQuantity())
                );
            }

            // OrderItem 생성
            BigDecimal itemTotal = productInfo.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            OrderItem orderItem = OrderItem.builder()
                    .productId(productInfo.getId())
                    .productName(productInfo.getName())
                    .productPrice(productInfo.getPrice())
                    .quantity(itemRequest.getQuantity())
                    .totalPrice(itemTotal)
                    .build();

            orderItems.add(orderItem);
            totalAmount = totalAmount.add(itemTotal);
        }

        // Step 2: 주문 생성
        String orderNumber = generateOrderNumber();

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .userId(request.getUserId())
                .totalAmount(totalAmount)
                .status(OrderStatus.PENDING)
                .deliveryAddress(request.getDeliveryAddress())
                .phoneNumber(request.getPhoneNumber())
                .orderNote(request.getOrderNote())
                .paymentMethod(request.getPaymentMethod())
                .build();

        // OrderItem 추가
        for (OrderItem item : orderItems) {
            order.addOrderItem(item);
        }

        Order savedOrder = orderRepository.save(order);

        // Step 3: 재고 차감 (Product Service 호출)
        try {
            for (OrderItem item : orderItems) {
                int newStock = getProductStock(item.getProductId()) - item.getQuantity();
                productServiceClient.updateStock(item.getProductId(), newStock);
            }
        } catch (Exception e) {
            log.error("Failed to update stock. Rolling back order: {}", orderNumber, e);
            throw new RuntimeException("재고 업데이트 실패. 주문이 취소되었습니다.", e);
        }

        // Step 4: Kafka 이벤트 발행
        publishOrderEvent(savedOrder, OrderEvent.EventType.ORDER_CREATED);

        log.info("Order created successfully: orderNumber={}, orderId={}", orderNumber, savedOrder.getId());

        return OrderResponse.from(savedOrder);
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다"));

        order.confirm();

        publishOrderEvent(order, OrderEvent.EventType.ORDER_CONFIRMED);

        log.info("Order confirmed: orderId={}", orderId);

        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse shipOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다"));

        order.ship();

        publishOrderEvent(order, OrderEvent.EventType.ORDER_SHIPPED);

        log.info("Order shipped: orderId={}", orderId);

        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse deliverOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다"));

        order.deliver();

        publishOrderEvent(order, OrderEvent.EventType.ORDER_DELIVERED);

        log.info("Order delivered: orderId={}", orderId);

        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다"));

        // 재고 복구
        try {
            for (OrderItem item : order.getOrderItems()) {
                int newStock = getProductStock(item.getProductId()) + item.getQuantity();
                productServiceClient.updateStock(item.getProductId(), newStock);
            }
        } catch (Exception e) {
            log.error("Failed to restore stock for cancelled order: {}", orderId, e);
        }

        order.cancel(reason);

        publishOrderEvent(order, OrderEvent.EventType.ORDER_CANCELLED);

        log.info("Order cancelled: orderId={}, reason={}", orderId, reason);

        return OrderResponse.from(order);
    }

    public OrderResponse getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다"));

        return OrderResponse.from(order);
    }

    public OrderResponse getOrderByOrderNumber(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다"));

        return OrderResponse.from(order);
    }

    public Page<OrderResponse> getOrdersByUserId(Long userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable)
                .map(OrderResponse::from);
    }

    public Page<OrderResponse> getOrdersByStatus(OrderStatus status, Pageable pageable) {
        return orderRepository.findByStatus(status, pageable)
                .map(OrderResponse::from);
    }

    private String generateOrderNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return "ORD-" + timestamp + "-" + uuid;
    }

    private int getProductStock(Long productId) {
        ProductInfo productInfo = productServiceClient.getProductInfo(productId);
        return productInfo.getStockQuantity();
    }

    private void publishOrderEvent(Order order, OrderEvent.EventType eventType) {
        List<OrderEvent.OrderItemInfo> items = order.getOrderItems().stream()
                .map(item -> OrderEvent.OrderItemInfo.builder()
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .price(item.getProductPrice())
                        .build())
                .collect(Collectors.toList());

        OrderEvent event = OrderEvent.builder()
                .eventType(eventType)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .items(items)
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .occurredAt(LocalDateTime.now())
                .build();

        kafkaTemplate.send(ORDER_TOPIC, String.valueOf(order.getId()), event);

        log.info("Order event published: eventType={}, orderId={}", eventType, order.getId());
    }
}