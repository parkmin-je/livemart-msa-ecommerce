package com.livemart.payment.repository;

import com.livemart.payment.domain.Payment;
import com.livemart.payment.domain.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionId(String transactionId);
    Optional<Payment> findByOrderNumber(String orderNumber);
    List<Payment> findByUserIdAndStatus(Long userId, PaymentStatus status);
    Page<Payment> findByUserId(Long userId, Pageable pageable);
    boolean existsByTransactionId(String transactionId);
}
