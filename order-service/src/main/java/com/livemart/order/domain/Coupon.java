package com.livemart.order.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons", indexes = {
    @Index(name = "idx_coupon_code", columnList = "code", unique = true),
    @Index(name = "idx_coupon_active", columnList = "active")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DiscountType discountType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(precision = 10, scale = 2)
    private BigDecimal minimumOrderAmount;

    @Column(precision = 10, scale = 2)
    private BigDecimal maximumDiscountAmount;

    @Column(nullable = false)
    private Integer totalQuantity;

    @Builder.Default
    @Column(nullable = false)
    private Integer usedQuantity = 0;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum DiscountType {
        PERCENTAGE,   // 퍼센트 할인
        FIXED_AMOUNT  // 정액 할인
    }

    public boolean isValid() {
        LocalDateTime now = LocalDateTime.now();
        return active
                && now.isAfter(startDate)
                && now.isBefore(endDate)
                && usedQuantity < totalQuantity;
    }

    public BigDecimal calculateDiscount(BigDecimal orderAmount) {
        if (!isValid()) {
            throw new IllegalStateException("유효하지 않은 쿠폰입니다");
        }
        if (minimumOrderAmount != null && orderAmount.compareTo(minimumOrderAmount) < 0) {
            throw new IllegalStateException("최소 주문 금액 미달: " + minimumOrderAmount + "원 이상 주문 필요");
        }

        BigDecimal discount;
        if (discountType == DiscountType.PERCENTAGE) {
            discount = orderAmount.multiply(discountValue).divide(BigDecimal.valueOf(100));
        } else {
            discount = discountValue;
        }

        if (maximumDiscountAmount != null && discount.compareTo(maximumDiscountAmount) > 0) {
            discount = maximumDiscountAmount;
        }

        return discount;
    }

    public void use() {
        if (!isValid()) {
            throw new IllegalStateException("사용 불가한 쿠폰입니다");
        }
        this.usedQuantity++;
    }

    public void deactivate() {
        this.active = false;
    }
}
