package com.livemart.order.service;

import com.livemart.order.client.PaymentFeignClient;
import com.livemart.order.client.ProductFeignClient;
import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderItem;
import com.livemart.order.domain.OrderStatus;
import com.livemart.order.dto.*;
import com.livemart.order.event.OrderEvent;
import com.livemart.order.repository.OrderRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService 단위 테스트")
class OrderServiceTest {

    @InjectMocks
    private OrderService orderService;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductFeignClient productFeignClient;

    @Mock
    private PaymentFeignClient paymentFeignClient;

    @Mock
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Mock
    private ParallelProductValidationService parallelValidationService;

    @Nested
    @DisplayName("주문 생성")
    class CreateOrderTest {

        @Test
        @DisplayName("성공 - 재고·결제 정상 시 PENDING 상태로 주문 생성 및 Kafka 이벤트 발행")
        void createOrder_success() {
            // given
            OrderItemRequest itemRequest = OrderItemRequest.builder()
                    .productId(10L)
                    .quantity(2)
                    .build();

            OrderCreateRequest request = OrderCreateRequest.builder()
                    .userId(1L)
                    .items(List.of(itemRequest))
                    .deliveryAddress("서울시 강남구 테헤란로 1")
                    .phoneNumber("010-1234-5678")
                    .paymentMethod("CARD")
                    .build();

            ProductInfo product = new ProductInfo(10L, "테스트 상품", BigDecimal.valueOf(15000), 10);

            given(parallelValidationService.validateInParallel(request.getItems()))
                    .willReturn(List.of(product));
            given(productFeignClient.getProduct(10L)).willReturn(product);
            willDoNothing().given(productFeignClient).updateStock(anyLong(), anyInt());

            PaymentResponse paymentResponse = new PaymentResponse();
            paymentResponse.setTransactionId("TXN-TEST-001");
            given(paymentFeignClient.processPayment(any(PaymentRequest.class)))
                    .willReturn(paymentResponse);

            given(orderRepository.save(any(Order.class))).willAnswer(inv -> inv.getArgument(0));
            given(kafkaTemplate.send(anyString(), anyString(), any(OrderEvent.class))).willReturn(null);

            // when
            OrderResponse response = orderService.createOrder(request);

            // then
            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(OrderStatus.PENDING);
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(30000)); // 15000 × 2
            assertThat(response.getPaymentTransactionId()).isEqualTo("TXN-TEST-001");

            then(orderRepository).should().save(any(Order.class));
            then(kafkaTemplate).should().send(eq("order-events"), anyString(), any(OrderEvent.class));
        }

        @Test
        @DisplayName("실패 - 결제 오류 시 저장된 주문 롤백(삭제)")
        void createOrder_paymentFailed_rollback() {
            // given
            OrderItemRequest itemRequest = OrderItemRequest.builder()
                    .productId(20L)
                    .quantity(1)
                    .build();

            OrderCreateRequest request = OrderCreateRequest.builder()
                    .userId(2L)
                    .items(List.of(itemRequest))
                    .deliveryAddress("부산시 해운대구")
                    .phoneNumber("010-9999-9999")
                    .paymentMethod("CARD")
                    .build();

            ProductInfo product = new ProductInfo(20L, "결제실패 상품", BigDecimal.valueOf(100000), 5);

            given(parallelValidationService.validateInParallel(request.getItems()))
                    .willReturn(List.of(product));
            given(productFeignClient.getProduct(20L)).willReturn(product);
            willDoNothing().given(productFeignClient).updateStock(anyLong(), anyInt());
            given(orderRepository.save(any(Order.class))).willAnswer(inv -> inv.getArgument(0));

            given(paymentFeignClient.processPayment(any(PaymentRequest.class)))
                    .willThrow(new RuntimeException("결제 서버 응답 없음"));

            // when & then
            assertThatThrownBy(() -> orderService.createOrder(request))
                    .isInstanceOf(RuntimeException.class);

            // 결제 실패 시 주문 삭제(롤백) 호출 검증
            then(orderRepository).should().delete(any(Order.class));
        }
    }

    @Nested
    @DisplayName("주문 조회")
    class GetOrderTest {

        @Test
        @DisplayName("성공 - ID로 주문 조회")
        void getOrder_success() {
            // given
            Order order = Order.builder()
                    .orderNumber("ORD-20240101-ABCD1234")
                    .userId(1L)
                    .totalAmount(BigDecimal.valueOf(50000))
                    .status(OrderStatus.PENDING)
                    .deliveryAddress("서울시 강남구")
                    .phoneNumber("010-1234-5678")
                    .paymentMethod("CARD")
                    .build();

            given(orderRepository.findById(1L)).willReturn(Optional.of(order));

            // when
            OrderResponse response = orderService.getOrder(1L);

            // then
            assertThat(response).isNotNull();
            assertThat(response.getOrderNumber()).isEqualTo("ORD-20240101-ABCD1234");
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getStatus()).isEqualTo(OrderStatus.PENDING);
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 주문")
        void getOrder_notFound() {
            // given
            given(orderRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> orderService.getOrder(999L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("주문을 찾을 수 없습니다.");
        }
    }

    @Nested
    @DisplayName("주문 확인")
    class ConfirmOrderTest {

        @Test
        @DisplayName("성공 - PENDING → CONFIRMED")
        void confirmOrder_success() {
            // given
            Order order = Order.builder()
                    .orderNumber("ORD-TEST-001")
                    .userId(1L)
                    .totalAmount(BigDecimal.valueOf(30000))
                    .status(OrderStatus.PENDING)
                    .build();

            given(orderRepository.findById(1L)).willReturn(Optional.of(order));
            given(kafkaTemplate.send(anyString(), anyString(), any(OrderEvent.class))).willReturn(null);

            // when
            OrderResponse response = orderService.confirmOrder(1L);

            // then
            assertThat(response.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        }
    }

    @Nested
    @DisplayName("주문 취소")
    class CancelOrderTest {

        @Test
        @DisplayName("실패 - 이미 취소된 주문")
        void cancelOrder_alreadyCancelled() {
            // given
            Order order = Order.builder()
                    .orderNumber("ORD-TEST-002")
                    .userId(1L)
                    .totalAmount(BigDecimal.valueOf(30000))
                    .status(OrderStatus.CANCELLED)
                    .build();

            given(orderRepository.findById(1L)).willReturn(Optional.of(order));

            // when & then
            assertThatThrownBy(() -> orderService.cancelOrder(1L, "변심"))
                    .isInstanceOf(RuntimeException.class);
        }

        @Test
        @DisplayName("실패 - 배송 중인 주문 취소 불가")
        void cancelOrder_shippedOrder() {
            // given
            Order order = Order.builder()
                    .orderNumber("ORD-TEST-003")
                    .userId(1L)
                    .totalAmount(BigDecimal.valueOf(30000))
                    .status(OrderStatus.SHIPPED)
                    .build();

            given(orderRepository.findById(1L)).willReturn(Optional.of(order));

            // when & then
            assertThatThrownBy(() -> orderService.cancelOrder(1L, "변심"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("취소할 수 없는 주문 상태입니다");
        }
    }

    @Nested
    @DisplayName("주문번호 조회")
    class GetOrderByNumberTest {

        @Test
        @DisplayName("성공 - 주문번호로 조회")
        void getOrderByNumber_success() {
            // given
            Order order = Order.builder()
                    .orderNumber("ORD-20240101-AAAA1111")
                    .userId(1L)
                    .totalAmount(BigDecimal.valueOf(10000))
                    .status(OrderStatus.PENDING)
                    .build();

            given(orderRepository.findByOrderNumber("ORD-20240101-AAAA1111"))
                    .willReturn(Optional.of(order));

            // when
            OrderResponse response = orderService.getOrderByOrderNumber("ORD-20240101-AAAA1111");

            // then
            assertThat(response.getOrderNumber()).isEqualTo("ORD-20240101-AAAA1111");
        }
    }
}
