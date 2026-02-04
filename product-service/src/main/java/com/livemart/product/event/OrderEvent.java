package com.livemart.product.event;

import com.livemart.product.domain.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEvent {
    private EventType eventType;
    private String orderNumber;
    private Long userId;
    private BigDecimal totalAmount;
    private Object status;
    private List<OrderItemInfo> items;
    private LocalDateTime occurredAt;

    public enum EventType {
        ORDER_CREATED,
        ORDER_CONFIRMED,
        ORDER_SHIPPED,
        ORDER_DELIVERED,
        ORDER_CANCELLED
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemInfo {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal price;
    }
}