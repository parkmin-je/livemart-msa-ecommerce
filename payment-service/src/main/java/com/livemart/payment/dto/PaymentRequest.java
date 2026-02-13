package com.livemart.payment.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentRequest {
    private String orderNumber;
    private Long userId;
    private BigDecimal amount;
    private String method;  // String으로 변경하여 유연하게 받음
    private String cardNumber;
}