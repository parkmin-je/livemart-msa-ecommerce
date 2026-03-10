package com.livemart.order.repository;

import com.livemart.order.domain.DailySettlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailySettlementRepository extends JpaRepository<DailySettlement, Long> {

    Optional<DailySettlement> findBySettlementDate(LocalDate settlementDate);

    List<DailySettlement> findBySettlementDateBetweenOrderBySettlementDate(LocalDate start, LocalDate end);
}
