package com.livemart.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

public class InventoryRequest {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotNull private Long productId;
        @NotBlank private String productName;
        @NotBlank private String warehouseCode;
        @Min(0) private int initialQuantity;
        @Min(0) private int reorderPoint;
        @Min(0) private int reorderQuantity;
        @Min(0) private int safetyStock;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Reserve {
        @NotNull private Long productId;
        @Min(1) private int quantity;
        private String orderId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Restock {
        @NotNull private Long productId;
        @Min(1) private int quantity;
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Adjust {
        @NotNull private Long productId;
        private int quantity;
        private String reason;
    }
}
