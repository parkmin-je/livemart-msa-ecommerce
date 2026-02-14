package com.livemart.payment.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "payment_events", indexes = {
    @Index(name = "idx_pe_transaction", columnList = "transactionId"),
    @Index(name = "idx_pe_created", columnList = "createdAt")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PaymentEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String transactionId;
    private String eventType;
    @Column(columnDefinition = "TEXT")
    private String payload;
    @Builder.Default
    private Instant createdAt = Instant.now();
}
