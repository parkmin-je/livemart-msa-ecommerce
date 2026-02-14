package com.livemart.payment.dto;

import com.livemart.payment.domain.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

public class PaymentRequest {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Create {
        @NotBlank private String orderNumber;
        private Long userId;
        @NotNull @DecimalMin("0.01") private BigDecimal amount;
        @NotNull private PaymentMethod paymentMethod;
        private String cardToken;
        private String returnUrl;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Refund {
        @NotBlank private String transactionId;
        @DecimalMin("0.01") private BigDecimal amount;
        private String reason;
    }
}
