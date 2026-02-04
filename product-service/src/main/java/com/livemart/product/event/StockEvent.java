package com.livemart.product.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockEvent {
    private EventType eventType;
    private Long productId;
    private Integer oldStock;
    private Integer newStock;
    private LocalDateTime occurredAt;

    public enum EventType {
        STOCK_UPDATED,
        STOCK_INSUFFICIENT,
        STOCK_RESTORED
    }
}