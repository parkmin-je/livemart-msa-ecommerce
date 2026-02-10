package com.livemart.order.integration;

import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderItem;
import com.livemart.order.domain.OrderStatus;
import com.livemart.order.repository.OrderRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testcontainers 기반 Order 통합 테스트
 * 실제 MySQL 컨테이너를 사용한 Repository 계층 검증
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class OrderIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("orderdb_test")
            .withUsername("test")
            .withPassword("test123")
            .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        // 비활성화할 외부 의존성
        registry.add("eureka.client.enabled", () -> "false");
        registry.add("spring.cloud.openfeign.circuitbreaker.enabled", () -> "false");
    }

    @Autowired
    private OrderRepository orderRepository;

    private Order createTestOrder(String orderNumber, Long userId, OrderStatus status) {
        Order order = Order.builder()
                .orderNumber(orderNumber)
                .userId(userId)
                .totalAmount(new BigDecimal("50000"))
                .status(status)
                .deliveryAddress("서울시 강남구 테헤란로 123")
                .phoneNumber("010-1234-5678")
                .orderNote("테스트 주문")
                .paymentMethod("CARD")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return orderRepository.save(order);
    }

    @Nested
    @DisplayName("주문 저장 및 조회 테스트")
    class SaveAndFindTests {

        @Test
        @DisplayName("주문을 저장하고 ID로 조회할 수 있다")
        void saveAndFindById() {
            // given
            Order order = createTestOrder("ORD-TEST-001", 1L, OrderStatus.PENDING);

            // when
            Optional<Order> found = orderRepository.findById(order.getId());

            // then
            assertThat(found).isPresent();
            assertThat(found.get().getOrderNumber()).isEqualTo("ORD-TEST-001");
            assertThat(found.get().getUserId()).isEqualTo(1L);
            assertThat(found.get().getStatus()).isEqualTo(OrderStatus.PENDING);
            assertThat(found.get().getTotalAmount()).isEqualByComparingTo(new BigDecimal("50000"));
        }

        @Test
        @DisplayName("주문번호로 주문을 조회할 수 있다")
        void findByOrderNumber() {
            // given
            createTestOrder("ORD-TEST-002", 1L, OrderStatus.CONFIRMED);

            // when
            Optional<Order> found = orderRepository.findByOrderNumber("ORD-TEST-002");

            // then
            assertThat(found).isPresent();
            assertThat(found.get().getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        }

        @Test
        @DisplayName("존재하지 않는 주문번호 조회 시 빈 Optional을 반환한다")
        void findByOrderNumber_notFound() {
            // when
            Optional<Order> found = orderRepository.findByOrderNumber("NON-EXISTENT");

            // then
            assertThat(found).isEmpty();
        }
    }

    @Nested
    @DisplayName("사용자별 주문 조회 테스트")
    class UserOrderTests {

        @Test
        @DisplayName("사용자 ID로 주문 목록을 페이징 조회할 수 있다")
        void findByUserId_paged() {
            // given
            Long userId = 100L;
            createTestOrder("ORD-PAGE-001", userId, OrderStatus.PENDING);
            createTestOrder("ORD-PAGE-002", userId, OrderStatus.CONFIRMED);
            createTestOrder("ORD-PAGE-003", userId, OrderStatus.SHIPPED);
            createTestOrder("ORD-PAGE-004", 200L, OrderStatus.PENDING); // 다른 사용자

            // when
            Page<Order> page = orderRepository.findByUserId(userId, PageRequest.of(0, 10));

            // then
            assertThat(page.getContent()).hasSize(3);
            assertThat(page.getContent()).allMatch(o -> o.getUserId().equals(userId));
        }

        @Test
        @DisplayName("사용자 ID와 상태로 주문을 필터링할 수 있다")
        void findByUserIdAndStatus() {
            // given
            Long userId = 101L;
            createTestOrder("ORD-FILTER-001", userId, OrderStatus.PENDING);
            createTestOrder("ORD-FILTER-002", userId, OrderStatus.CONFIRMED);
            createTestOrder("ORD-FILTER-003", userId, OrderStatus.PENDING);

            // when
            List<Order> pendingOrders = orderRepository.findByUserIdAndStatus(userId, OrderStatus.PENDING);

            // then
            assertThat(pendingOrders).hasSize(2);
            assertThat(pendingOrders).allMatch(o -> o.getStatus() == OrderStatus.PENDING);
        }
    }

    @Nested
    @DisplayName("주문 상태 변경 테스트")
    class OrderStatusTests {

        @Test
        @DisplayName("주문 상태별 카운트를 조회할 수 있다")
        void countByStatus() {
            // given
            createTestOrder("ORD-COUNT-001", 300L, OrderStatus.PENDING);
            createTestOrder("ORD-COUNT-002", 300L, OrderStatus.PENDING);
            createTestOrder("ORD-COUNT-003", 300L, OrderStatus.CONFIRMED);

            // when
            Long pendingCount = orderRepository.countByStatus(OrderStatus.PENDING);

            // then
            assertThat(pendingCount).isGreaterThanOrEqualTo(2L);
        }

        @Test
        @DisplayName("주문을 확인 상태로 변경할 수 있다")
        void confirmOrder() {
            // given
            Order order = createTestOrder("ORD-CONFIRM-001", 400L, OrderStatus.PENDING);

            // when
            order.confirm();
            Order saved = orderRepository.save(order);

            // then
            assertThat(saved.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
            assertThat(saved.getConfirmedAt()).isNotNull();
        }

        @Test
        @DisplayName("주문을 배송 상태로 변경할 수 있다")
        void shipOrder() {
            // given
            Order order = createTestOrder("ORD-SHIP-001", 400L, OrderStatus.PENDING);
            order.confirm();
            orderRepository.save(order);

            // when
            order.ship();
            Order saved = orderRepository.save(order);

            // then
            assertThat(saved.getStatus()).isEqualTo(OrderStatus.SHIPPED);
            assertThat(saved.getShippedAt()).isNotNull();
        }

        @Test
        @DisplayName("주문을 취소할 수 있다")
        void cancelOrder() {
            // given
            Order order = createTestOrder("ORD-CANCEL-001", 400L, OrderStatus.PENDING);

            // when
            order.cancel();
            Order saved = orderRepository.save(order);

            // then
            assertThat(saved.getStatus()).isEqualTo(OrderStatus.CANCELLED);
            assertThat(saved.getCancelledAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Fetch Join 테스트")
    class FetchJoinTests {

        @Test
        @DisplayName("주문과 주문 아이템을 Fetch Join으로 함께 조회할 수 있다")
        void findByIdWithItems() {
            // given
            Order order = createTestOrder("ORD-FETCH-001", 500L, OrderStatus.PENDING);

            OrderItem item = OrderItem.builder()
                    .productId(1L)
                    .productName("테스트 상품")
                    .productPrice(new BigDecimal("25000"))
                    .quantity(2)
                    .totalPrice(new BigDecimal("50000"))
                    .build();
            order.addOrderItem(item);
            orderRepository.save(order);

            // when
            Optional<Order> found = orderRepository.findByIdWithItems(order.getId());

            // then
            assertThat(found).isPresent();
            assertThat(found.get().getItems()).hasSize(1);
            assertThat(found.get().getItems().get(0).getProductName()).isEqualTo("테스트 상품");
            assertThat(found.get().getItems().get(0).getQuantity()).isEqualTo(2);
        }

        @Test
        @DisplayName("주문번호로 Fetch Join 조회할 수 있다")
        void findByOrderNumberWithItems() {
            // given
            Order order = createTestOrder("ORD-FETCH-002", 500L, OrderStatus.CONFIRMED);
            OrderItem item1 = OrderItem.builder()
                    .productId(10L)
                    .productName("상품 A")
                    .productPrice(new BigDecimal("10000"))
                    .quantity(1)
                    .totalPrice(new BigDecimal("10000"))
                    .build();
            OrderItem item2 = OrderItem.builder()
                    .productId(20L)
                    .productName("상품 B")
                    .productPrice(new BigDecimal("20000"))
                    .quantity(2)
                    .totalPrice(new BigDecimal("40000"))
                    .build();
            order.addOrderItem(item1);
            order.addOrderItem(item2);
            orderRepository.save(order);

            // when
            Optional<Order> found = orderRepository.findByOrderNumberWithItems("ORD-FETCH-002");

            // then
            assertThat(found).isPresent();
            assertThat(found.get().getItems()).hasSize(2);
        }
    }

    @Nested
    @DisplayName("날짜 범위 조회 테스트")
    class DateRangeTests {

        @Test
        @DisplayName("날짜 범위로 사용자 주문을 조회할 수 있다")
        void findByUserIdAndDateRange() {
            // given
            Long userId = 600L;
            createTestOrder("ORD-DATE-001", userId, OrderStatus.PENDING);
            createTestOrder("ORD-DATE-002", userId, OrderStatus.CONFIRMED);

            LocalDateTime startDate = LocalDateTime.now().minusHours(1);
            LocalDateTime endDate = LocalDateTime.now().plusHours(1);

            // when
            List<Order> orders = orderRepository.findByUserIdAndDateRange(userId, startDate, endDate);

            // then
            assertThat(orders).hasSize(2);
            assertThat(orders).allMatch(o -> o.getUserId().equals(userId));
        }
    }
}
