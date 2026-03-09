package com.livemart.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.payment.domain.*;
import com.livemart.payment.dto.*;
import com.livemart.payment.event.PaymentEvent;
import com.livemart.payment.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
public class PaymentService {

    private static final String PAYMENT_TOPIC = "payment-events";

    private final PaymentRepository paymentRepository;
    private final PaymentEventRepository eventRepository;
    private final KafkaTemplate<String, PaymentEvent> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public PaymentService(PaymentRepository paymentRepository,
                         PaymentEventRepository eventRepository,
                         @Qualifier("paymentKafkaTemplate") KafkaTemplate<String, PaymentEvent> kafkaTemplate,
                         java.util.Optional<ObjectMapper> objectMapper) {
        this.paymentRepository = paymentRepository;
        this.eventRepository = eventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper.orElse(new ObjectMapper());
    }

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
            publishPaymentEvent(payment, PaymentEvent.EventType.PAYMENT_COMPLETED);

            log.info("결제 완료: txn={}, order={}, amount={}",
                    transactionId, request.getOrderNumber(), request.getAmount());
        } catch (Exception e) {
            payment.fail(e.getMessage());
            payment = paymentRepository.save(payment);
            saveEvent(payment, "PAYMENT_FAILED");
            publishPaymentEvent(payment, PaymentEvent.EventType.PAYMENT_FAILED);
            log.error("결제 실패: txn={}, reason={}", transactionId, e.getMessage());
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
        saveEvent(payment, "PAYMENT_CANCELLED");
        publishPaymentEvent(payment, PaymentEvent.EventType.PAYMENT_CANCELLED);

        log.info("환불 완료: txn={}", request.getTransactionId());
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
        log.info("결제 실행 ({}): amount={}", payment.getPaymentMethod(), payment.getAmount());
        // 실제 PG사 연동 로직 (현재는 시뮬레이션)
        return "APR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private void saveEvent(Payment payment, String eventType) {
        try {
            eventRepository.save(com.livemart.payment.domain.PaymentEvent.builder()
                    .transactionId(payment.getTransactionId())
                    .eventType(eventType)
                    .payload(objectMapper.writeValueAsString(PaymentResponse.from(payment)))
                    .build());
        } catch (Exception e) {
            log.error("결제 이벤트 DB 저장 실패", e);
        }
    }

    private void publishPaymentEvent(Payment payment, PaymentEvent.EventType eventType) {
        try {
            PaymentEvent event = PaymentEvent.builder()
                    .eventType(eventType)
                    .transactionId(payment.getTransactionId())
                    .orderNumber(payment.getOrderNumber())
                    .userId(payment.getUserId())
                    .amount(payment.getAmount())
                    .status(payment.getStatus())
                    .approvalNumber(payment.getApprovalNumber())
                    .occurredAt(LocalDateTime.now())
                    .build();

            kafkaTemplate.send(PAYMENT_TOPIC, payment.getOrderNumber(), event);
            log.info("Kafka 이벤트 발행: topic={}, eventType={}, txn={}",
                    PAYMENT_TOPIC, eventType, payment.getTransactionId());
        } catch (Exception e) {
            log.error("Kafka 이벤트 발행 실패: eventType={}", eventType, e);
        }
    }
}
