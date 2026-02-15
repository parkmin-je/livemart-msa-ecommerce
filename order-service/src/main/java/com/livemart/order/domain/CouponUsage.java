package com.livemart.order.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupon_usages", indexes = {
    @Index(name = "idx_usage_user", columnList = "userId"),
    @Index(name = "idx_usage_coupon", columnList = "coupon_id"),
    @Index(name = "idx_usage_order", columnList = "orderNumber")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_coupon_user", columnNames = {"coupon_id", "userId"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CouponUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coupon_id", nullable = false)
    private Coupon coupon;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String orderNumber;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(nullable = false)
    private LocalDateTime usedAt;

    @PrePersist
    protected void onCreate() {
        usedAt = LocalDateTime.now();
    }
}
