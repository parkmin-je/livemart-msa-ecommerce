package com.livemart.payment.domain;

public enum PaymentStatus {
    PENDING, PROCESSING, COMPLETED, FAILED,
    CANCELLED, REFUNDED, PARTIALLY_REFUNDED
}
