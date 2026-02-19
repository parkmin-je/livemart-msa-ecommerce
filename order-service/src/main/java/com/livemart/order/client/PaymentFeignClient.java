package com.livemart.order.client;

import com.livemart.order.dto.PaymentRequest;
import com.livemart.order.dto.PaymentResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@FeignClient(name = "PAYMENT-SERVICE", fallbackFactory = PaymentFeignClientFallbackFactory.class)
public interface PaymentFeignClient {

    @PostMapping("/api/v1/payments")
    PaymentResponse processPayment(@RequestBody PaymentRequest request);

    @PostMapping("/api/v1/payments/{transactionId}/cancel")
    void cancelPayment(@PathVariable("transactionId") String transactionId, @RequestBody Map<String, String> body);
}
