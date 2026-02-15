package com.livemart.inventory.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "inventories", indexes = {
    @Index(name = "idx_inventory_product", columnList = "productId", unique = true),
    @Index(name = "idx_inventory_warehouse", columnList = "warehouseCode"),
    @Index(name = "idx_inventory_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long productId;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private String warehouseCode;

    @Column(nullable = false)
    private int availableQuantity;

    @Column(nullable = false)
    private int reservedQuantity;

    private int reorderPoint;

    private int reorderQuantity;

    private int safetyStock;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InventoryStatus status = InventoryStatus.IN_STOCK;

    @Version
    private Long version;

    @Builder.Default
    private Instant lastRestockedAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Builder.Default
    private Instant createdAt = Instant.now();

    public int getTotalQuantity() {
        return availableQuantity + reservedQuantity;
    }

    public boolean canFulfill(int quantity) {
        return availableQuantity >= quantity;
    }

    public void reserve(int quantity) {
        if (!canFulfill(quantity)) {
            throw new IllegalStateException("Insufficient stock for product: " + productId);
        }
        this.availableQuantity -= quantity;
        this.reservedQuantity += quantity;
        updateStatus();
    }

    public void confirmReservation(int quantity) {
        this.reservedQuantity -= quantity;
        updateStatus();
    }

    public void cancelReservation(int quantity) {
        this.reservedQuantity -= quantity;
        this.availableQuantity += quantity;
        updateStatus();
    }

    public void restock(int quantity) {
        this.availableQuantity += quantity;
        this.lastRestockedAt = Instant.now();
        updateStatus();
    }

    public boolean needsReorder() {
        return availableQuantity <= reorderPoint;
    }

    private void updateStatus() {
        if (availableQuantity <= 0) {
            this.status = InventoryStatus.OUT_OF_STOCK;
        } else if (availableQuantity <= safetyStock) {
            this.status = InventoryStatus.LOW_STOCK;
        } else {
            this.status = InventoryStatus.IN_STOCK;
        }
        this.updatedAt = Instant.now();
    }
}
