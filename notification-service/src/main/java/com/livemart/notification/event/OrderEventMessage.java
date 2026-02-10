package com.livemart.notification.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class OrderEventMessage {
    private String eventType;
    private String orderNumber;
    private Long userId;
    private BigDecimal totalAmount;
    private String status;
    private LocalDateTime occurredAt;
    private String cancelReason;
}
