package com.livemart.order.repository;

import com.livemart.order.domain.ReturnRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

    Optional<ReturnRequest> findByReturnNumber(String returnNumber);

    Page<ReturnRequest> findByUserIdOrderByRequestedAtDesc(Long userId, Pageable pageable);

    Page<ReturnRequest> findByStatusOrderByRequestedAtDesc(ReturnRequest.ReturnStatus status, Pageable pageable);

    Page<ReturnRequest> findByOrderIdOrderByRequestedAtDesc(Long orderId, Pageable pageable);

    boolean existsByOrderIdAndStatus(Long orderId, ReturnRequest.ReturnStatus status);
}
