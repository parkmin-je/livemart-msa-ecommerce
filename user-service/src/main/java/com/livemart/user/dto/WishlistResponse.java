package com.livemart.user.dto;

import com.livemart.user.domain.Wishlist;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class WishlistResponse {

    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal productPrice;
    private String productImageUrl;
    private LocalDateTime createdAt;

    public static WishlistResponse from(Wishlist wishlist) {
        return WishlistResponse.builder()
                .id(wishlist.getId())
                .productId(wishlist.getProductId())
                .productName(wishlist.getProductName())
                .productPrice(wishlist.getProductPrice())
                .productImageUrl(wishlist.getProductImageUrl())
                .createdAt(wishlist.getCreatedAt())
                .build();
    }
}
