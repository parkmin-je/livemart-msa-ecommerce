package com.livemart.product.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderEvent {

    private EventType eventType;
    private Long orderId;
    private String orderNumber;
    private Long userId;
    private List<OrderItemInfo> items;
    private BigDecimal totalAmount;
    private String status;
    private LocalDateTime occurredAt;
    private String cancelReason;  // ✅ 추가

    public enum EventType {
        ORDER_CREATED,
        ORDER_CONFIRMED,
        ORDER_SHIPPED,
        ORDER_DELIVERED,
        ORDER_CANCELLED  // ✅ 추가
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OrderItemInfo {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal price;
    }
}
