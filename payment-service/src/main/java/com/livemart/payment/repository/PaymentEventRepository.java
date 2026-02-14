package com.livemart.payment.repository;

import com.livemart.payment.domain.PaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentEventRepository extends JpaRepository<PaymentEvent, Long> {
    List<PaymentEvent> findByTransactionIdOrderByCreatedAtAsc(String transactionId);
}
