package com.livemart.order.service;

import com.livemart.order.domain.Coupon;
import com.livemart.order.domain.CouponUsage;
import com.livemart.order.dto.CouponRequest;
import com.livemart.order.dto.CouponResponse;
import com.livemart.order.repository.CouponRepository;
import com.livemart.order.repository.CouponUsageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;

    @Transactional
    public CouponResponse createCoupon(CouponRequest request) {
        if (couponRepository.existsByCode(request.getCode())) {
            throw new IllegalStateException("이미 존재하는 쿠폰 코드입니다: " + request.getCode());
        }

        Coupon coupon = Coupon.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minimumOrderAmount(request.getMinimumOrderAmount())
                .maximumDiscountAmount(request.getMaximumDiscountAmount())
                .totalQuantity(request.getTotalQuantity())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();

        coupon = couponRepository.save(coupon);
        log.info("쿠폰 생성: code={}, name={}", coupon.getCode(), coupon.getName());
        return CouponResponse.from(coupon);
    }

    public CouponResponse getCoupon(String code) {
        Coupon coupon = couponRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("쿠폰을 찾을 수 없습니다: " + code));
        return CouponResponse.from(coupon);
    }

    public Page<CouponResponse> getActiveCoupons(Pageable pageable) {
        return couponRepository.findByActiveTrue(pageable).map(CouponResponse::from);
    }

    public CouponResponse.DiscountPreview previewDiscount(String couponCode, BigDecimal orderAmount) {
        Coupon coupon = couponRepository.findByCode(couponCode)
                .orElseThrow(() -> new IllegalArgumentException("쿠폰을 찾을 수 없습니다: " + couponCode));

        BigDecimal discount = coupon.calculateDiscount(orderAmount);

        return CouponResponse.DiscountPreview.builder()
                .couponCode(couponCode)
                .originalAmount(orderAmount)
                .discountAmount(discount)
                .finalAmount(orderAmount.subtract(discount))
                .build();
    }

    @Transactional
    public BigDecimal applyCoupon(String couponCode, Long userId, String orderNumber, BigDecimal orderAmount) {
        Coupon coupon = couponRepository.findByCode(couponCode)
                .orElseThrow(() -> new IllegalArgumentException("쿠폰을 찾을 수 없습니다"));

        if (couponUsageRepository.existsByCouponIdAndUserId(coupon.getId(), userId)) {
            throw new IllegalStateException("이미 사용한 쿠폰입니다");
        }

        BigDecimal discount = coupon.calculateDiscount(orderAmount);
        coupon.use();

        CouponUsage usage = CouponUsage.builder()
                .coupon(coupon)
                .userId(userId)
                .orderNumber(orderNumber)
                .discountAmount(discount)
                .build();
        couponUsageRepository.save(usage);

        log.info("쿠폰 적용: code={}, userId={}, orderNumber={}, discount={}",
                couponCode, userId, orderNumber, discount);
        return discount;
    }

    @Transactional
    public void deactivateCoupon(Long couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new IllegalArgumentException("쿠폰을 찾을 수 없습니다"));
        coupon.deactivate();
        log.info("쿠폰 비활성화: id={}", couponId);
    }
}
