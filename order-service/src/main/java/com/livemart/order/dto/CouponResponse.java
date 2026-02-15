package com.livemart.order.dto;

import com.livemart.order.domain.Coupon;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class CouponResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Coupon.DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minimumOrderAmount;
    private BigDecimal maximumDiscountAmount;
    private Integer totalQuantity;
    private Integer usedQuantity;
    private Integer remainingQuantity;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Boolean active;
    private Boolean valid;

    public static CouponResponse from(Coupon coupon) {
        return CouponResponse.builder()
                .id(coupon.getId())
                .code(coupon.getCode())
                .name(coupon.getName())
                .description(coupon.getDescription())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .minimumOrderAmount(coupon.getMinimumOrderAmount())
                .maximumDiscountAmount(coupon.getMaximumDiscountAmount())
                .totalQuantity(coupon.getTotalQuantity())
                .usedQuantity(coupon.getUsedQuantity())
                .remainingQuantity(coupon.getTotalQuantity() - coupon.getUsedQuantity())
                .startDate(coupon.getStartDate())
                .endDate(coupon.getEndDate())
                .active(coupon.getActive())
                .valid(coupon.isValid())
                .build();
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class DiscountPreview {
        private String couponCode;
        private BigDecimal originalAmount;
        private BigDecimal discountAmount;
        private BigDecimal finalAmount;
    }
}
