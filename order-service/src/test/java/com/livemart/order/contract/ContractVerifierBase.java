package com.livemart.order.contract;

import com.livemart.order.controller.OrderController;
import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderStatus;
import com.livemart.order.dto.OrderCreateRequest;
import com.livemart.order.dto.OrderResponse;
import com.livemart.order.service.OrderService;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

/**
 * Spring Cloud Contract — Producer-side 계약 테스트 베이스 클래스
 *
 * 계약(contracts/*.yml)에서 자동 생성된 테스트가 이 클래스를 상속합니다.
 * OrderController → OrderService 사이의 HTTP 인터페이스를 MockMvc로 검증합니다.
 *
 * 사용 흐름:
 *   ./gradlew :order-service:generateContractTests → 계약 파일로 테스트 자동 생성
 *   ./gradlew :order-service:test                 → 계약 테스트 포함 전체 테스트 실행
 *   ./gradlew :order-service:publishStubsToScm   → 스텁 JAR 배포 (Consumer에서 사용)
 */
@WebMvcTest(OrderController.class)
public abstract class ContractVerifierBase {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @BeforeEach
    void setup() {
        // 주문 생성 성공 스텁
        OrderResponse createResponse = OrderResponse.builder()
                .id(1L)
                .orderNumber("ORD-20240101-ABCD1234")
                .userId(1L)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.valueOf(30000))
                .deliveryAddress("서울시 강남구 테헤란로 1")
                .phoneNumber("010-1234-5678")
                .paymentMethod("CARD")
                .build();

        given(orderService.createOrder(any(OrderCreateRequest.class)))
                .willReturn(createResponse);

        // 주문 단건 조회 성공 스텁 (ID=1)
        OrderResponse getResponse = OrderResponse.builder()
                .id(1L)
                .orderNumber("ORD-20240101-ABCD1234")
                .userId(1L)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.valueOf(30000))
                .build();

        given(orderService.getOrder(1L)).willReturn(getResponse);

        // 존재하지 않는 주문 조회 시 예외 (ID=99999)
        given(orderService.getOrder(99999L))
                .willThrow(com.livemart.common.exception.BusinessException.notFound("Order", 99999L));

        RestAssuredMockMvc.mockMvc(mockMvc);
    }
}
