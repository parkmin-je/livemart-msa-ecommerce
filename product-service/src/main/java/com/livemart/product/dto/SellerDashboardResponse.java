package com.livemart.product.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Builder
@AllArgsConstructor
public class SellerDashboardResponse {

    private Long sellerId;
    private Integer totalProducts;
    private Integer activeProducts;
    private Integer outOfStockProducts;
    private BigDecimal totalRevenue;
    private Double averageRating;
    private Long totalReviews;
    private List<ProductSummary> topProducts;
    private Map<String, Integer> categoryDistribution;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ProductSummary {
        private Long id;
        private String name;
        private BigDecimal price;
        private Integer stockQuantity;
        private String status;
        private Double averageRating;
        private Long reviewCount;
    }
}
