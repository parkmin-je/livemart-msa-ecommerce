package com.livemart.order.event;

import com.livemart.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Kafka Consumer: payment-events 수신
 * - PAYMENT_COMPLETED → 주문 확인(ORDER_CONFIRMED)
 * - PAYMENT_FAILED    → 주문 취소(ORDER_CANCELLED)
 * - PAYMENT_CANCELLED → 로그
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderPaymentConsumer {

    private final OrderService orderService;

    @KafkaListener(
        topics = "payment-events",
        groupId = "order-service-payment-group",
        containerFactory = "paymentKafkaListenerContainerFactory"
    )
    public void handlePaymentEvent(
            @Payload Map<String, Object> event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {

        try {
            String eventType   = String.valueOf(event.get("eventType"));
            String orderNumber = String.valueOf(event.get("orderNumber"));
            String transactionId = String.valueOf(event.get("transactionId"));

            log.info("결제 이벤트 수신: type={}, order={}, txn={}", eventType, orderNumber, transactionId);

            switch (eventType) {
                case "PAYMENT_COMPLETED" -> handlePaymentCompleted(orderNumber, transactionId);
                case "PAYMENT_FAILED"    -> handlePaymentFailed(orderNumber, transactionId);
                case "PAYMENT_CANCELLED" -> log.info("결제 취소 이벤트 수신: order={}", orderNumber);
                default                  -> log.debug("처리하지 않는 결제 이벤트: {}", eventType);
            }
        } catch (Exception e) {
            log.error("결제 이벤트 처리 실패: event={}", event, e);
        }
    }

    /**
     * 결제 완료 → 주문 확인 상태로 변경
     */
    private void handlePaymentCompleted(String orderNumber, String transactionId) {
        try {
            var orderResp = orderService.getOrderByOrderNumber(orderNumber);
            orderService.confirmOrder(orderResp.getId());
            log.info("결제 완료 → 주문 확인 처리: order={}, txn={}", orderNumber, transactionId);
        } catch (Exception e) {
            log.error("주문 확인 처리 실패: order={}", orderNumber, e);
        }
    }

    /**
     * 결제 실패 → 주문 취소
     */
    private void handlePaymentFailed(String orderNumber, String transactionId) {
        try {
            var orderResp = orderService.getOrderByOrderNumber(orderNumber);
            orderService.cancelOrder(orderResp.getId(), "결제 실패: " + transactionId);
            log.info("결제 실패 → 주문 취소 처리: order={}, txn={}", orderNumber, transactionId);
        } catch (Exception e) {
            log.error("결제 실패로 인한 주문 취소 처리 실패: order={}", orderNumber, e);
        }
    }
}
