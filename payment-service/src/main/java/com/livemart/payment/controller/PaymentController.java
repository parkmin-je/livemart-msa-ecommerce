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
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponse> processPayment(@Valid @RequestBody PaymentRequest.Create request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.processPayment(request));
    }

    @PostMapping("/refund")
    @IdempotencyKey(prefix = "payment-refund")
    @AuditLog(action = "REFUND_PAYMENT", resource = "Payment")
    @Operation(summary = "환불 처리")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponse> refund(@Valid @RequestBody PaymentRequest.Refund request) {
        return ResponseEntity.ok(paymentService.refundPayment(request));
    }

    @GetMapping("/transaction/{transactionId}")
    @Operation(summary = "거래 ID로 결제 조회")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponse> getByTransaction(@PathVariable String transactionId) {
        return ResponseEntity.ok(paymentService.getByTransactionId(transactionId));
    }

    @GetMapping("/order/{orderNumber}")
    @Operation(summary = "주문번호로 결제 조회")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponse> getByOrder(@PathVariable String orderNumber) {
        return ResponseEntity.ok(paymentService.getByOrderNumber(orderNumber));
    }

    /**
     * Toss Payments 결제 승인
     * 프론트에서 Toss 위젯 결제 완료 후 paymentKey/orderId/amount로 최종 승인 요청
     */
    @PostMapping("/toss/confirm")
    @Operation(summary = "Toss Payments 결제 승인")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponse> confirmToss(
            @Valid @RequestBody PaymentRequest.TossConfirm request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.confirmTossPayment(request));
    }
}
