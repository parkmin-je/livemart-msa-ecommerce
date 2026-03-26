package com.livemart.order.domain.model;

import java.util.Objects;

/**
 * 주문 ID Value Object
 *
 * Value Object 특성:
 * - 불변 (final 필드)
 * - 동등성 = 값 동등성 (id 값이 같으면 동일)
 * - 생성 시 유효성 검증
 *
 * JPA에서는 @Embeddable로 사용하거나 컨버터로 Long↔OrderId 변환.
 */
public final class OrderId {

    private final Long value;

    private OrderId(Long value) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException("OrderId는 양수여야 합니다: " + value);
        }
        this.value = value;
    }

    public static OrderId of(Long value) {
        return new OrderId(value);
    }

    public Long getValue() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrderId other)) return false;
        return Objects.equals(value, other.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return "OrderId(" + value + ")";
    }
}
