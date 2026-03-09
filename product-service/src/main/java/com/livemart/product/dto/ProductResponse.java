package com.livemart.product.dto;

import com.livemart.product.document.ProductDocument;
import com.livemart.product.domain.Product;
import com.livemart.product.domain.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stockQuantity;
    private Long categoryId;
    private String categoryName;
    private ProductStatus status;
    private String imageUrl;
    private Long sellerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProductResponse from(ProductDocument doc) {
        ProductStatus status = null;
        try {
            if (doc.getStatus() != null) {
                status = ProductStatus.valueOf(doc.getStatus());
            }
        } catch (IllegalArgumentException ignored) {}

        return ProductResponse.builder()
                .id(doc.getId() != null ? Long.parseLong(doc.getId()) : null)
                .name(doc.getName())
                .description(doc.getDescription())
                .price(doc.getPrice())
                .stockQuantity(doc.getStockQuantity())
                .categoryName(doc.getCategoryName())
                .status(status)
                .imageUrl(doc.getImageUrl())
                .sellerId(doc.getSellerId())
                .build();
    }

    public static ProductResponse from(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stockQuantity(product.getStockQuantity())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .status(product.getStatus())
                .imageUrl(product.getImageUrl())
                .sellerId(product.getSellerId())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}