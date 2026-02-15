package com.livemart.notification.event;

import com.livemart.notification.domain.Notification;
import com.livemart.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class StockAlertConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "stock-alert-events", groupId = "notification-stock-group")
    public void handleStockAlert(Map<String, Object> alert) {
        String eventType = (String) alert.get("eventType");
        Object productIdObj = alert.get("productId");
        String productName = (String) alert.get("productName");
        Object availableObj = alert.get("availableQuantity");
        String warehouseCode = (String) alert.get("warehouseCode");

        Long productId = productIdObj instanceof Number ? ((Number) productIdObj).longValue() : 0L;
        int available = availableObj instanceof Number ? ((Number) availableObj).intValue() : 0;

        log.info("재고 알림 이벤트 수신: type={}, productId={}, available={}", eventType, productId, available);

        String title;
        String message;

        if ("OUT_OF_STOCK".equals(eventType)) {
            title = "[긴급] 재고 소진 - " + productName;
            message = String.format("상품 '%s'(ID: %d)의 재고가 소진되었습니다. 창고: %s. 즉시 발주가 필요합니다.",
                    productName, productId, warehouseCode);
        } else {
            title = "[주의] 재고 부족 - " + productName;
            message = String.format("상품 '%s'(ID: %d)의 재고가 %d개로 부족합니다. 창고: %s. 재주문을 검토해 주세요.",
                    productName, productId, available, warehouseCode);
        }

        // 관리자에게 알림 (userId=0은 시스템/관리자 알림으로 사용)
        notificationService.createNotification(
                0L, Notification.NotificationType.STOCK_LOW, title, message,
                String.valueOf(productId)
        ).subscribe(
                result -> log.info("재고 알림 생성 완료: {}", result.getId()),
                error -> log.error("재고 알림 생성 실패: {}", error.getMessage())
        );
    }
}
