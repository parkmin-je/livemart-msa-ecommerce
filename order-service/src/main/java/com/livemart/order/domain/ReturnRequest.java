package com.livemart.order.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests", indexes = {
    @Index(name = "idx_return_order", columnList = "order_id"),
    @Index(name = "idx_return_user", columnList = "userId"),
    @Index(name = "idx_return_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String returnNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReturnType returnType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReturnStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReturnReason reason;

    @Column(length = 1000)
    private String reasonDetail;

    @Column(precision = 10, scale = 2)
    private BigDecimal refundAmount;

    @Column(length = 500)
    private String imageUrls;

    private String adminNote;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    private LocalDateTime approvedAt;
    private LocalDateTime rejectedAt;
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        requestedAt = LocalDateTime.now();
    }

    public enum ReturnType {
        RETURN,     // 반품 (상품 반환 + 환불)
        REFUND,     // 환불만
        EXCHANGE    // 교환
    }

    public enum ReturnStatus {
        REQUESTED,  // 요청됨
        APPROVED,   // 승인됨
        REJECTED,   // 거절됨
        IN_TRANSIT, // 반품 배송 중
        RECEIVED,   // 반품 수령 완료
        COMPLETED,  // 처리 완료 (환불 완료)
        CANCELLED   // 취소됨
    }

    public enum ReturnReason {
        DEFECTIVE,          // 불량/파손
        WRONG_ITEM,         // 오배송
        NOT_AS_DESCRIBED,   // 상품 설명과 다름
        CHANGED_MIND,       // 단순 변심
        SIZE_ISSUE,         // 사이즈 문제
        LATE_DELIVERY,      // 배송 지연
        OTHER               // 기타
    }

    public void approve(BigDecimal refundAmount, String adminNote) {
        this.status = ReturnStatus.APPROVED;
        this.refundAmount = refundAmount;
        this.adminNote = adminNote;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject(String adminNote) {
        this.status = ReturnStatus.REJECTED;
        this.adminNote = adminNote;
        this.rejectedAt = LocalDateTime.now();
    }

    public void markInTransit() {
        this.status = ReturnStatus.IN_TRANSIT;
    }

    public void markReceived() {
        this.status = ReturnStatus.RECEIVED;
    }

    public void complete() {
        this.status = ReturnStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = ReturnStatus.CANCELLED;
    }
}
