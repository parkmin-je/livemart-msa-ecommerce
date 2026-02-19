package com.livemart.payment.domain;

public enum PaymentMethod {
    CARD,  // Generic card payment (for backward compatibility)
    CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, VIRTUAL_ACCOUNT,
    KAKAO_PAY, NAVER_PAY, TOSS_PAY, APPLE_PAY, GOOGLE_PAY
}
