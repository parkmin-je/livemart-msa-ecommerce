package com.livemart.order.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

/**
 * 금액 Value Object (Money Pattern)
 *
 * 금액 관련 비즈니스 로직을 캡슐화:
 * - 불변: 연산은 항상 새 Money 객체 반환
 * - 통화 포함: 다중 통화 지원 가능 구조
 * - 정밀도: BigDecimal 사용 (부동소수점 오류 방지)
 * - 음수 방지: 생성 시 검증
 *
 * 사용 예:
 *   Money price = Money.won(10000);
 *   Money total = price.multiply(3).add(Money.won(500)); // 30,500원
 */
public final class Money {

    public static final Money ZERO = new Money(BigDecimal.ZERO, "KRW");

    private final BigDecimal amount;
    private final String currencyCode;

    private Money(BigDecimal amount, String currencyCode) {
        if (amount == null) {
            throw new IllegalArgumentException("금액은 null일 수 없습니다");
        }
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.currencyCode = Objects.requireNonNull(currencyCode, "통화코드는 null일 수 없습니다");
    }

    /**
     * 원화 금액 생성 (가장 일반적인 팩토리 메서드)
     */
    public static Money won(long amount) {
        return new Money(BigDecimal.valueOf(amount), "KRW");
    }

    public static Money won(BigDecimal amount) {
        return new Money(amount, "KRW");
    }

    public static Money of(BigDecimal amount, String currencyCode) {
        return new Money(amount, currencyCode);
    }

    // ── 산술 연산 (불변 — 새 객체 반환) ─────────────────────────

    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currencyCode);
    }

    public Money subtract(Money other) {
        validateSameCurrency(other);
        BigDecimal result = this.amount.subtract(other.amount);
        if (result.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(
                String.format("금액 부족: %.2f - %.2f < 0", this.amount, other.amount)
            );
        }
        return new Money(result, this.currencyCode);
    }

    public Money multiply(int factor) {
        return new Money(this.amount.multiply(BigDecimal.valueOf(factor)), this.currencyCode);
    }

    public Money multiply(BigDecimal factor) {
        return new Money(this.amount.multiply(factor), this.currencyCode);
    }

    /**
     * 할인 적용 (퍼센트)
     * @param discountPercent 0~100 사이의 할인율
     */
    public Money applyDiscount(int discountPercent) {
        if (discountPercent < 0 || discountPercent > 100) {
            throw new IllegalArgumentException("할인율은 0~100 사이여야 합니다: " + discountPercent);
        }
        BigDecimal factor = BigDecimal.ONE.subtract(
            BigDecimal.valueOf(discountPercent).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
        );
        return new Money(this.amount.multiply(factor), this.currencyCode);
    }

    // ── 비교 ──────────────────────────────────────────────────

    public boolean isGreaterThan(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) > 0;
    }

    public boolean isLessThan(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) < 0;
    }

    public boolean isZero() {
        return this.amount.compareTo(BigDecimal.ZERO) == 0;
    }

    // ── 접근자 ────────────────────────────────────────────────

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    // ── Value Object 동등성 ───────────────────────────────────

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money other)) return false;
        return amount.compareTo(other.amount) == 0
            && Objects.equals(currencyCode, other.currencyCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount.stripTrailingZeros(), currencyCode);
    }

    @Override
    public String toString() {
        return String.format("%s %.2f", currencyCode, amount);
    }

    private void validateSameCurrency(Money other) {
        if (!this.currencyCode.equals(other.currencyCode)) {
            throw new IllegalArgumentException(
                String.format("통화 불일치: %s != %s", this.currencyCode, other.currencyCode)
            );
        }
    }
}
