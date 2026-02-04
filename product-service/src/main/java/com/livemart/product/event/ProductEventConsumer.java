package com.livemart.product.event;

import com.livemart.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductEventConsumer {
    private final ProductService productService;

    @KafkaListener(topics = "order-events", groupId = "product-service-group")
    public void handleOrderEvent(OrderEvent event) {
        log.info("Received order event: {}", event);

        if ("ORDER_CREATED".equals(event.getEventType().name())) {
            try {
                // 재고 차감
                for (OrderEvent.OrderItemInfo item : event.getItems()) {
                    productService.updateStock(item.getProductId(), -item.getQuantity());
                    log.info("Stock updated: productId={}, quantity={}",
                            item.getProductId(), item.getQuantity());
                }

                // 재고 업데이트 성공 이벤트 발행
                // TODO: Kafka로 STOCK_UPDATED 이벤트 발행

            } catch (Exception e) {
                log.error("Failed to update stock for order: {}", event.getOrderNumber(), e);
                // TODO: 재고 부족 이벤트 발행 (STOCK_INSUFFICIENT)
            }
        }
    }
}