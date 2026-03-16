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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class PaymentService {

    private static final String PAYMENT_TOPIC = "payment-events";

    private final PaymentRepository paymentRepository;
    private final PaymentEventRepository eventRepository;
    private final KafkaTemplate<String, PaymentEvent> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final TossPaymentClient tossPaymentClient;

    public PaymentService(PaymentRepository paymentRepository,
                         PaymentEventRepository eventRepository,
                         @Qualifier("paymentKafkaTemplate") KafkaTemplate<String, PaymentEvent> kafkaTemplate,
                         java.util.Optional<ObjectMapper> objectMapper,
                         TossPaymentClient tossPaymentClient) {
        this.paymentRepository = paymentRepository;
        this.eventRepository = eventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper.orElse(new ObjectMapper());
        this.tossPaymentClient = tossPaymentClient;
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

    /**
     * Toss Payments 결제 승인 처리
     * 프론트에서 paymentKey/orderId/amount를 받아 Toss API로 최종 승인
     */
    @Transactional
    public PaymentResponse confirmTossPayment(PaymentRequest.TossConfirm request) {
        Map<String, Object> tossResult = tossPaymentClient.confirm(
                request.getPaymentKey(), request.getOrderId(), request.getAmount());

        String transactionId = "TOSS-" + request.getPaymentKey().substring(0, Math.min(12, request.getPaymentKey().length()));
        String approvalNumber = (String) tossResult.getOrDefault("approvalNumber",
                "APR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        Payment payment = Payment.builder()
                .transactionId(transactionId)
                .orderNumber(request.getOrderId())
                .amount(BigDecimal.valueOf(request.getAmount()))
                .paymentMethod(PaymentMethod.TOSS_PAY)
                .status(PaymentStatus.COMPLETED)
                .approvalNumber(approvalNumber)
                .build();

        payment = paymentRepository.save(payment);
        saveEvent(payment, "PAYMENT_COMPLETED");
        publishPaymentEvent(payment, PaymentEvent.EventType.PAYMENT_COMPLETED);

        log.info("Toss 결제 승인 완료: txn={}, order={}", transactionId, request.getOrderId());
        return PaymentResponse.from(payment);
    }

    private String executePayment(Payment payment, PaymentRequest.Create request) {
        log.info("결제 실행 ({}): amount={}", payment.getPaymentMethod(), payment.getAmount());
        // Saga 패턴: 주문 이벤트 수신 후 자동 처리 (시뮬레이션)
        // Toss 위젯 결제는 /toss/confirm 엔드포인트로 별도 처리
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
