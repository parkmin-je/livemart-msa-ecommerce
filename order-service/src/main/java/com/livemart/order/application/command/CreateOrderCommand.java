package com.livemart.order.application.command;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

/**
 * 주문 생성 Command (CQRS Command 객체)
 *
 * Command 특성:
 * - 불변 record (Java 16+)
 * - 명시적 의도: "주문을 생성하라"는 명령을 표현
 * - 유효성 검증 어노테이션으로 입력 보장
 * - DTO와 다름: Command는 Application 계층 내부에서 이동, DTO는 외부 API 경계
 *
 * 처리 흐름:
 *   Controller → CreateOrderCommand → CreateOrderCommandHandler → Order Aggregate
 */
public record CreateOrderCommand(

    @NotNull(message = "사용자 ID는 필수입니다")
    Long userId,

    @NotEmpty(message = "주문 항목은 1개 이상이어야 합니다")
    @Valid
    List<OrderItemCommand> items,

    @NotNull(message = "배송 주소는 필수입니다")
    String deliveryAddress,

    @NotNull(message = "연락처는 필수입니다")
    String phoneNumber,

    @NotNull(message = "결제 방식은 필수입니다")
    String paymentMethod,

    String orderNote,

    // 쿠폰 코드 (선택)
    String couponCode,

    // 포인트 사용 금액 (선택)
    Long usePoint

) {

    /**
     * 주문 항목 Command
     */
    public record OrderItemCommand(

        @NotNull(message = "상품 ID는 필수입니다")
        Long productId,

        @NotNull @Positive(message = "수량은 1 이상이어야 합니다")
        Integer quantity,

        // 주문 시점 가격 (서버에서 재검증, 클라이언트 값 신뢰 안 함)
        Long requestedPrice

    ) {}
}
