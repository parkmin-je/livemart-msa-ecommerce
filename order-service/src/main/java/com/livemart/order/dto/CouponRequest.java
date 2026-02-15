package com.livemart.order.dto;

import com.livemart.order.domain.Coupon;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponRequest {

    @NotBlank(message = "쿠폰 코드는 필수입니다")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "쿠폰 이름은 필수입니다")
    private String name;

    private String description;

    @NotNull(message = "할인 유형은 필수입니다")
    private Coupon.DiscountType discountType;

    @NotNull(message = "할인 값은 필수입니다")
    @DecimalMin(value = "0.01")
    private BigDecimal discountValue;

    private BigDecimal minimumOrderAmount;
    private BigDecimal maximumDiscountAmount;

    @NotNull(message = "총 수량은 필수입니다")
    @Min(1)
    private Integer totalQuantity;

    @NotNull(message = "시작일은 필수입니다")
    private LocalDateTime startDate;

    @NotNull(message = "종료일은 필수입니다")
    private LocalDateTime endDate;
}
