package com.livemart.inventory.dto;

import com.livemart.inventory.domain.Inventory;
import com.livemart.inventory.domain.InventoryStatus;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String warehouseCode;
    private int availableQuantity;
    private int reservedQuantity;
    private int totalQuantity;
    private int reorderPoint;
    private int safetyStock;
    private InventoryStatus status;
    private boolean needsReorder;
    private Instant lastRestockedAt;
    private Instant updatedAt;

    public static InventoryResponse from(Inventory inv) {
        return InventoryResponse.builder()
                .id(inv.getId())
                .productId(inv.getProductId())
                .productName(inv.getProductName())
                .warehouseCode(inv.getWarehouseCode())
                .availableQuantity(inv.getAvailableQuantity())
                .reservedQuantity(inv.getReservedQuantity())
                .totalQuantity(inv.getTotalQuantity())
                .reorderPoint(inv.getReorderPoint())
                .safetyStock(inv.getSafetyStock())
                .status(inv.getStatus())
                .needsReorder(inv.needsReorder())
                .lastRestockedAt(inv.getLastRestockedAt())
                .updatedAt(inv.getUpdatedAt())
                .build();
    }
}
