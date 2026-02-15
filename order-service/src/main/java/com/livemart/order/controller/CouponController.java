package com.livemart.order.controller;

import com.livemart.order.dto.CouponRequest;
import com.livemart.order.dto.CouponResponse;
import com.livemart.order.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@Tag(name = "Coupon API", description = "쿠폰 관리 API")
@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    @Operation(summary = "쿠폰 생성")
    @PostMapping
    public ResponseEntity<CouponResponse> createCoupon(@Valid @RequestBody CouponRequest request) {
        return ResponseEntity.ok(couponService.createCoupon(request));
    }

    @Operation(summary = "쿠폰 조회")
    @GetMapping("/{code}")
    public ResponseEntity<CouponResponse> getCoupon(@PathVariable String code) {
        return ResponseEntity.ok(couponService.getCoupon(code));
    }

    @Operation(summary = "활성 쿠폰 목록")
    @GetMapping
    public ResponseEntity<Page<CouponResponse>> getActiveCoupons(Pageable pageable) {
        return ResponseEntity.ok(couponService.getActiveCoupons(pageable));
    }

    @Operation(summary = "할인 미리보기")
    @GetMapping("/{code}/preview")
    public ResponseEntity<CouponResponse.DiscountPreview> previewDiscount(
            @PathVariable String code,
            @RequestParam BigDecimal orderAmount) {
        return ResponseEntity.ok(couponService.previewDiscount(code, orderAmount));
    }

    @Operation(summary = "쿠폰 비활성화")
    @DeleteMapping("/{couponId}")
    public ResponseEntity<Void> deactivateCoupon(@PathVariable Long couponId) {
        couponService.deactivateCoupon(couponId);
        return ResponseEntity.ok().build();
    }
}
