package com.livemart.notification.event;

import com.livemart.notification.domain.Notification;
import com.livemart.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka 이벤트 소비자 - 주문 이벤트를 수신하여 알림 생성
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "order-events", groupId = "notification-group")
    public void handleOrderEvent(OrderEventMessage event) {
        log.info("주문 이벤트 수신: eventType={}, orderNumber={}", event.getEventType(), event.getOrderNumber());

        Notification.NotificationType type;
        String title;
        String message;

        switch (event.getEventType()) {
            case "ORDER_CREATED" -> {
                type = Notification.NotificationType.ORDER_CREATED;
                title = "주문이 접수되었습니다";
                message = String.format("주문번호 %s가 접수되었습니다. 금액: %s원",
                        event.getOrderNumber(), event.getTotalAmount());
            }
            case "ORDER_CONFIRMED" -> {
                type = Notification.NotificationType.ORDER_CONFIRMED;
                title = "주문이 확인되었습니다";
                message = String.format("주문번호 %s가 확인되었습니다. 곧 배송이 시작됩니다.",
                        event.getOrderNumber());
            }
            case "ORDER_SHIPPED" -> {
                type = Notification.NotificationType.ORDER_SHIPPED;
                title = "배송이 시작되었습니다";
                message = String.format("주문번호 %s의 배송이 시작되었습니다.",
                        event.getOrderNumber());
            }
            case "ORDER_DELIVERED" -> {
                type = Notification.NotificationType.ORDER_DELIVERED;
                title = "배송이 완료되었습니다";
                message = String.format("주문번호 %s의 배송이 완료되었습니다.",
                        event.getOrderNumber());
            }
            case "ORDER_CANCELLED" -> {
                type = Notification.NotificationType.ORDER_CANCELLED;
                title = "주문이 취소되었습니다";
                message = String.format("주문번호 %s가 취소되었습니다. 사유: %s",
                        event.getOrderNumber(), event.getCancelReason());
            }
            default -> {
                log.warn("알 수 없는 이벤트 타입: {}", event.getEventType());
                return;
            }
        }

        notificationService.createNotification(
                event.getUserId(), type, title, message, event.getOrderNumber()
        ).subscribe(
                result -> log.info("알림 생성 완료: {}", result.getId()),
                error -> log.error("알림 생성 실패: {}", error.getMessage())
        );
    }
}
