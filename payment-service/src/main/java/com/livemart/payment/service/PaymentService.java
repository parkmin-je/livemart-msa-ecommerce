package com.livemart.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.common.event.DomainEvent;
import com.livemart.common.event.EventPublisher;
import com.livemart.payment.domain.*;
import com.livemart.payment.dto.*;
import com.livemart.payment.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentEventRepository eventRepository;
    private final EventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Transactional
    public PaymentResponse processPayment(PaymentRequest.Create request) {
        String transactionId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Payment payment = Payment.builder()
                .transactionId(transactionId)
                .orderNumber(request.getOrderNumber())
                .userId(request.getUserId())
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.PROCESSING)
                .build();

        try {
            String approvalNumber = executePayment(payment, request);
            payment.complete(approvalNumber);
            payment = paymentRepository.save(payment);

            saveEvent(payment, "PAYMENT_COMPLETED");
            publishPaymentEvent(payment, "PAYMENT_COMPLETED");

            log.info("Payment completed: txn={}, order={}, amount={}",
                    transactionId, request.getOrderNumber(), request.getAmount());
        } catch (Exception e) {
            payment.fail(e.getMessage());
            payment = paymentRepository.save(payment);
            saveEvent(payment, "PAYMENT_FAILED");
            publishPaymentEvent(payment, "PAYMENT_FAILED");
            log.error("Payment failed: txn={}, reason={}", transactionId, e.getMessage());
        }

        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse refundPayment(PaymentRequest.Refund request) {
        Payment payment = paymentRepository.findByTransactionId(request.getTransactionId())
                .orElseThrow(() -> new EntityNotFoundException("Payment not found: " + request.getTransactionId()));

        if (request.getAmount() != null) {
            payment.partialRefund(request.getAmount());
        } else {
            payment.cancel();
        }

        payment = paymentRepository.save(payment);
        saveEvent(payment, "PAYMENT_REFUNDED");
        publishPaymentEvent(payment, "PAYMENT_REFUNDED");

        return PaymentResponse.from(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getByTransactionId(String transactionId) {
        return paymentRepository.findByTransactionId(transactionId)
                .map(PaymentResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found: " + transactionId));
    }

    @Transactional(readOnly = true)
    public PaymentResponse getByOrderNumber(String orderNumber) {
        return paymentRepository.findByOrderNumber(orderNumber)
                .map(PaymentResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found for order: " + orderNumber));
    }

    private String executePayment(Payment payment, PaymentRequest.Create request) {
        log.info("Executing payment via {}: amount={}", payment.getPaymentMethod(), payment.getAmount());
        return "APR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private void saveEvent(Payment payment, String eventType) {
        try {
            eventRepository.save(PaymentEvent.builder()
                    .transactionId(payment.getTransactionId())
                    .eventType(eventType)
                    .payload(objectMapper.writeValueAsString(PaymentResponse.from(payment)))
                    .build());
        } catch (Exception e) {
            log.error("Failed to save payment event", e);
        }
    }

    private void publishPaymentEvent(Payment payment, String eventType) {
        eventPublisher.publish("payment-events", DomainEvent.builder()
                .aggregateType("Payment")
                .aggregateId(payment.getTransactionId())
                .eventType(eventType)
                .payload("{\"transactionId\":\"" + payment.getTransactionId() +
                         "\",\"orderNumber\":\"" + payment.getOrderNumber() +
                         "\",\"amount\":" + payment.getAmount() +
                         ",\"status\":\"" + payment.getStatus() + "\"}")
                .build());
    }
}
