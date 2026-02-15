package com.livemart.payment.controller;

import com.livemart.common.audit.AuditLog;
import com.livemart.common.idempotency.IdempotencyKey;
import com.livemart.payment.dto.*;
import com.livemart.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "결제 관리 API")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @IdempotencyKey(prefix = "payment-process")
    @AuditLog(action = "PROCESS_PAYMENT", resource = "Payment")
    @Operation(summary = "결제 처리")
    public ResponseEntity<PaymentResponse> processPayment(@Valid @RequestBody PaymentRequest.Create request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.processPayment(request));
    }

    @PostMapping("/refund")
    @IdempotencyKey(prefix = "payment-refund")
    @AuditLog(action = "REFUND_PAYMENT", resource = "Payment")
    @Operation(summary = "환불 처리")
    public ResponseEntity<PaymentResponse> refund(@Valid @RequestBody PaymentRequest.Refund request) {
        return ResponseEntity.ok(paymentService.refundPayment(request));
    }

    @GetMapping("/transaction/{transactionId}")
    @Operation(summary = "거래 ID로 결제 조회")
    public ResponseEntity<PaymentResponse> getByTransaction(@PathVariable String transactionId) {
        return ResponseEntity.ok(paymentService.getByTransactionId(transactionId));
    }

    @GetMapping("/order/{orderNumber}")
    @Operation(summary = "주문번호로 결제 조회")
    public ResponseEntity<PaymentResponse> getByOrder(@PathVariable String orderNumber) {
        return ResponseEntity.ok(paymentService.getByOrderNumber(orderNumber));
    }
}
