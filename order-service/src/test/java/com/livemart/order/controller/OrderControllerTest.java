package com.livemart.order.controller;

import com.livemart.order.domain.OrderStatus;
import com.livemart.order.dto.OrderResponse;
import com.livemart.order.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderController 단위 테스트")
class OrderControllerTest {

    @InjectMocks
    private OrderController orderController;

    @Mock
    private OrderService orderService;

    @Test
    @DisplayName("GET /api/orders/{orderId} - 주문 조회 성공")
    void getOrder_success() {
        // given
        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .orderNumber("ORD-TEST-001")
                .userId(1L)
                .items(Collections.emptyList())
                .totalAmount(BigDecimal.valueOf(50000))
                .status(OrderStatus.PENDING)
                .deliveryAddress("서울시 강남구")
                .phoneNumber("010-1234-5678")
                .paymentMethod("CARD")
                .createdAt(LocalDateTime.now())
                .build();

        given(orderService.getOrder(1L)).willReturn(response);

        // when
        ResponseEntity<OrderResponse> result = orderController.getOrder(1L);

        // then
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getOrderNumber()).isEqualTo("ORD-TEST-001");
        assertThat(result.getBody().getStatus()).isEqualTo(OrderStatus.PENDING);
    }

    @Test
    @DisplayName("GET /api/orders/number/{orderNumber} - 주문번호 조회 성공")
    void getOrderByNumber_success() {
        // given
        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .orderNumber("ORD-20240101-AAAA1111")
                .userId(1L)
                .items(Collections.emptyList())
                .totalAmount(BigDecimal.valueOf(30000))
                .status(OrderStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        given(orderService.getOrderByOrderNumber("ORD-20240101-AAAA1111")).willReturn(response);

        // when
        ResponseEntity<OrderResponse> result = orderController.getOrderByNumber("ORD-20240101-AAAA1111");

        // then
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getOrderNumber()).isEqualTo("ORD-20240101-AAAA1111");
        assertThat(result.getBody().getStatus()).isEqualTo(OrderStatus.CONFIRMED);
    }

    @Test
    @DisplayName("POST /api/orders/{orderId}/confirm - 주문 확인 성공")
    void confirmOrder_success() {
        // given
        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .orderNumber("ORD-TEST-002")
                .userId(1L)
                .items(Collections.emptyList())
                .totalAmount(BigDecimal.valueOf(20000))
                .status(OrderStatus.CONFIRMED)
                .build();

        given(orderService.confirmOrder(1L)).willReturn(response);

        // when
        ResponseEntity<OrderResponse> result = orderController.confirmOrder(1L);

        // then
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getStatus()).isEqualTo(OrderStatus.CONFIRMED);
    }
}
