package com.livemart.user.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WishlistRequest {

    @NotNull(message = "상품 ID는 필수입니다")
    private Long productId;

    @NotNull(message = "상품명은 필수입니다")
    private String productName;

    @NotNull(message = "상품 가격은 필수입니다")
    private BigDecimal productPrice;

    private String productImageUrl;
}
