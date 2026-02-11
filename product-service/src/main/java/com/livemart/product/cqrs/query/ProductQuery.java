package com.livemart.product.cqrs.query;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * CQRS Pattern - Query 객체
 * 상품 조회 쿼리를 나타내는 DTO
 */
public class ProductQuery {

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GetProduct {
        private Long productId;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchProducts {
        private String keyword;
        private Long categoryId;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private Integer page;
        private Integer size;
        private String sortBy;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GetProductsByCategory {
        private Long categoryId;
        private Integer page;
        private Integer size;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GetLowStockProducts {
        private Integer threshold;
    }
}
