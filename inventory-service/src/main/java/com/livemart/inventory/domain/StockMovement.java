package com.livemart.inventory.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "stock_movements", indexes = {
    @Index(name = "idx_movement_product", columnList = "productId"),
    @Index(name = "idx_movement_type", columnList = "movementType"),
    @Index(name = "idx_movement_created", columnList = "createdAt")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long productId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementType movementType;

    @Column(nullable = false)
    private int quantity;

    private int previousQuantity;

    private int newQuantity;

    private String referenceId;

    private String reason;

    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum MovementType {
        RESTOCK, RESERVATION, RESERVATION_CONFIRM, RESERVATION_CANCEL,
        ADJUSTMENT, RETURN, DAMAGED, TRANSFER_IN, TRANSFER_OUT
    }
}
