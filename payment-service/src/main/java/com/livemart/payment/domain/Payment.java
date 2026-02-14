package com.livemart.payment.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments", indexes = {
    @Index(name = "idx_payment_order", columnList = "orderNumber"),
    @Index(name = "idx_payment_transaction", columnList = "transactionId", unique = true),
    @Index(name = "idx_payment_status", columnList = "status")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String transactionId;

    @Column(nullable = false)
    private String orderNumber;

    private Long userId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(precision = 15, scale = 2)
    private BigDecimal refundedAmount;

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    private String approvalNumber;
    private String stripePaymentIntentId;
    private String failureReason;
    private String cardLast4;
    private String cardBrand;

    @Builder.Default private Instant createdAt = Instant.now();
    private Instant completedAt;
    private Instant cancelledAt;

    @Version private Long version;

    public void complete(String approvalNumber) {
        this.status = PaymentStatus.COMPLETED;
        this.approvalNumber = approvalNumber;
        this.completedAt = Instant.now();
    }

    public void fail(String reason) {
        this.status = PaymentStatus.FAILED;
        this.failureReason = reason;
    }

    public void cancel() {
        this.status = PaymentStatus.CANCELLED;
        this.refundedAmount = this.amount;
        this.cancelledAt = Instant.now();
    }

    public void partialRefund(BigDecimal refundAmount) {
        this.refundedAmount = (this.refundedAmount != null)
                ? this.refundedAmount.add(refundAmount) : refundAmount;
        if (this.refundedAmount.compareTo(this.amount) >= 0) {
            this.status = PaymentStatus.REFUNDED;
        } else {
            this.status = PaymentStatus.PARTIALLY_REFUNDED;
        }
    }
}
