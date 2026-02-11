package com.livemart.product.cqrs.command;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * CQRS Pattern - Command 객체
 * 상품 변경 명령을 나타내는 DTO
 */
public class ProductCommand {

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateProduct {
        private String name;
        private String description;
        private BigDecimal price;
        private Integer stockQuantity;
        private Long categoryId;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProduct {
        private Long productId;
        private String name;
        private String description;
        private BigDecimal price;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateStock {
        private Long productId;
        private Integer quantity;
        private StockOperation operation;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeleteProduct {
        private Long productId;
    }

    public enum StockOperation {
        INCREASE,  // 재고 증가
        DECREASE,  // 재고 감소
        SET        // 재고 설정
    }
}
