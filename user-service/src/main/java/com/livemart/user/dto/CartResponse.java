package com.livemart.user.dto;

import com.livemart.user.domain.CartItem;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class CartResponse {

    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal productPrice;
    private String productImageUrl;
    private Integer quantity;
    private BigDecimal totalPrice;
    private LocalDateTime createdAt;

    public static CartResponse from(CartItem item) {
        return CartResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(item.getProductName())
                .productPrice(item.getProductPrice())
                .productImageUrl(item.getProductImageUrl())
                .quantity(item.getQuantity())
                .totalPrice(item.getTotalPrice())
                .createdAt(item.getCreatedAt())
                .build();
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CartSummary {
        private List<CartResponse> items;
        private Integer totalItems;
        private BigDecimal totalAmount;
    }
}
