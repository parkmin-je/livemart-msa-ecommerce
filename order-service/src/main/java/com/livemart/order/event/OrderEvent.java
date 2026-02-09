package com.livemart.order.event;

import com.livemart.order.domain.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;  // ✅ Getter만 있던 것을 Data로 변경
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data  // ✅ @Getter 대신 @Data 사용
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEvent {

    private EventType eventType;
    private Long orderId;
    private String orderNumber;
    private Long userId;
    private List<OrderItemInfo> items;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private LocalDateTime occurredAt;
    private String cancelReason;  // ✅ getCancelReason() 자동 생성됨

    public enum EventType {
        ORDER_CREATED,
        ORDER_CONFIRMED,
        ORDER_SHIPPED,
        ORDER_DELIVERED,
        ORDER_CANCELLED
    }

    @Data  // ✅ @Getter 대신 @Data 사용
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