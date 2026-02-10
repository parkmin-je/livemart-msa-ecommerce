package com.livemart.payment.controller;

import com.livemart.payment.dto.PaymentRequest;
import com.livemart.payment.dto.PaymentResponse;
import com.livemart.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Payment API", description = "결제 관리 API")
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @Operation(summary = "결제 처리", description = "주문에 대한 결제를 처리합니다")
    @PostMapping
    public ResponseEntity<PaymentResponse> processPayment(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.processPayment(request));
    }

    @Operation(summary = "결제 취소", description = "결제를 취소합니다")
    @PostMapping("/{transactionId}/cancel")
    public ResponseEntity<PaymentResponse> cancelPayment(
            @Parameter(description = "결제 트랜잭션 ID") @PathVariable String transactionId) {
        return ResponseEntity.ok(paymentService.cancelPayment(transactionId));
    }

    @Operation(summary = "주문번호로 결제 조회", description = "주문번호로 결제 정보를 조회합니다")
    @GetMapping("/order/{orderNumber}")
    public ResponseEntity<PaymentResponse> getPaymentByOrderNumber(
            @Parameter(description = "주문번호") @PathVariable String orderNumber) {
        return ResponseEntity.ok(paymentService.getPaymentByOrderNumber(orderNumber));
    }
}