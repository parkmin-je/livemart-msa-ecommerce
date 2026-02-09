package com.livemart.product.event;

import com.livemart.product.domain.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;  // ✅ 변경
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data  // ✅ @Getter에서 @Data로 변경
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

    @Data  // ✅ @Getter에서 @Data로 변경
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
