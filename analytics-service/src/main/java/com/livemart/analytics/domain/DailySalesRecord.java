package com.livemart.analytics.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "daily_sales_records", indexes = {
    @Index(name = "idx_daily_sales_date", columnList = "sales_date", unique = true)
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DailySalesRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sales_date", nullable = false, unique = true)
    private LocalDate salesDate;

    @Column(nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Integer orderCount = 0;

    public void addSale(BigDecimal amount) {
        this.totalAmount = this.totalAmount.add(amount);
        this.orderCount++;
    }
}
