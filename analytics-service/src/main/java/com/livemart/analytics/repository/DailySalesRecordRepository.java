package com.livemart.analytics.repository;

import com.livemart.analytics.domain.DailySalesRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailySalesRecordRepository extends JpaRepository<DailySalesRecord, Long> {

    Optional<DailySalesRecord> findBySalesDate(LocalDate salesDate);

    List<DailySalesRecord> findBySalesDateBetweenOrderBySalesDate(LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(d.totalAmount), 0) FROM DailySalesRecord d " +
           "WHERE d.salesDate BETWEEN :start AND :end")
    BigDecimal sumTotalAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(d.orderCount), 0) FROM DailySalesRecord d " +
           "WHERE d.salesDate BETWEEN :start AND :end")
    int sumOrderCountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);
}
