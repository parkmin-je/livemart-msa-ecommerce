package com.livemart.product.event;

import com.livemart.product.domain.ProcessedEvent;
import com.livemart.product.repository.ProcessedEventRepository;
import com.livemart.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductEventConsumer {
    private final ProductService productService;
    private final ProcessedEventRepository processedEventRepository;

    @KafkaListener(topics = "order-events", groupId = "product-service-group")
    public void handleOrderEvent(OrderEvent event) {
        String eventId = event.getOrderNumber() + "_" + event.getEventType();

        log.info("Received order event: eventType={}, orderNumber={}, eventId={}",
                event.getEventType(), event.getOrderNumber(), eventId);

        if (processedEventRepository.existsById(eventId)) {
            log.warn("Duplicate event skipped: eventId={}", eventId);
            return;
        }

        try {
            switch (event.getEventType()) {
                case ORDER_CREATED:
                    handleOrderCreated(event, eventId);
                    break;
                case ORDER_CANCELLED:
                    handleOrderCancelled(event, eventId);
                    break;
                default:
                    log.debug("Unhandled event type: {}", event.getEventType());
            }
        } catch (Exception e) {
            log.error("Failed to process order event: orderNumber={}, eventType={}",
                    event.getOrderNumber(), event.getEventType(), e);
        }
    }

    @Transactional
    protected void handleOrderCreated(OrderEvent event, String eventId) {
        log.info("Processing ORDER_CREATED: orderNumber={}", event.getOrderNumber());

        for (OrderEvent.OrderItemInfo item : event.getItems()) {
            try {
                int currentStock = productService.getProduct(item.getProductId()).getStockQuantity();
                int newStock = currentStock - item.getQuantity();
                productService.updateStock(item.getProductId(), newStock);

                log.info("Stock deducted: productId={}, quantity={}, newStock={}",
                        item.getProductId(), item.getQuantity(), newStock);
            } catch (Exception e) {
                log.error("Failed to deduct stock: productId={}, orderNumber={}",
                        item.getProductId(), event.getOrderNumber(), e);
            }
        }

        saveProcessedEvent(eventId, "ORDER_CREATED");
    }

    @Transactional
    protected void handleOrderCancelled(OrderEvent event, String eventId) {
        log.info("Processing ORDER_CANCELLED: orderNumber={}, reason={}",
                event.getOrderNumber(), event.getCancelReason());

        for (OrderEvent.OrderItemInfo item : event.getItems()) {
            try {
                productService.restoreStock(item.getProductId(), item.getQuantity());
                log.info("Stock restored: productId={}, quantity={}, reason={}",
                        item.getProductId(), item.getQuantity(), event.getCancelReason());
            } catch (Exception e) {
                log.error("Failed to restore stock: productId={}, orderNumber={}",
                        item.getProductId(), event.getOrderNumber(), e);
            }
        }

        saveProcessedEvent(eventId, "ORDER_CANCELLED");
        log.info("Order cancellation processed: orderNumber={}", event.getOrderNumber());
    }

    private void saveProcessedEvent(String eventId, String eventType) {
        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(eventId)
                .eventType(eventType)
                .processedAt(LocalDateTime.now())
                .build());
    }
}
