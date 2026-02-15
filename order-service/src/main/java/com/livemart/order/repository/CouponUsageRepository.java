package com.livemart.order.repository;

import com.livemart.order.domain.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {

    boolean existsByCouponIdAndUserId(Long couponId, Long userId);

    List<CouponUsage> findByUserId(Long userId);

    List<CouponUsage> findByOrderNumber(String orderNumber);
}
