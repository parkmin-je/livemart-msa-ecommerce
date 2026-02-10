package com.livemart.notification.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private String id;
    private Long userId;
    private NotificationType type;
    private String title;
    private String message;
    private String referenceId;
    private boolean read;
    private LocalDateTime createdAt;

    public enum NotificationType {
        ORDER_CREATED, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED,
        ORDER_CANCELLED, PAYMENT_COMPLETED, PAYMENT_FAILED, STOCK_LOW
    }
}
