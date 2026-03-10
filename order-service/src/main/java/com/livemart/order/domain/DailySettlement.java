package com.livemart.order.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 일별 정산 집계 엔티티
 * Spring Batch DailySettlementJob이 매일 자정 실행 후 집계 결과를 저장
 */
@Entity
@Table(name = "daily_settlements", indexes = {
    @Index(name = "idx_daily_settlement_date", columnList = "settlement_date", unique = true)
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DailySettlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "settlement_date", nullable = false, unique = true)
    private LocalDate settlementDate;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalOrders = 0;

    @Column(nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal averageOrderAmount = BigDecimal.ZERO;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * 정산 집계 업데이트
     */
    public void updateAggregates(int orders, BigDecimal revenue, BigDecimal avgAmount) {
        this.totalOrders = orders;
        this.totalRevenue = revenue;
        this.averageOrderAmount = avgAmount;
    }
}
