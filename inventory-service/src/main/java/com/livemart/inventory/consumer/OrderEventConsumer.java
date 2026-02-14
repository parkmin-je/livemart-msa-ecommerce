package com.livemart.inventory.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.inventory.dto.InventoryRequest;
import com.livemart.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final InventoryService inventoryService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "order-events", groupId = "inventory-service")
    public void handleOrderEvent(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            String eventType = event.path("eventType").asText();
            JsonNode payload = event.has("payload") && event.get("payload").isTextual()
                    ? objectMapper.readTree(event.get("payload").asText())
                    : event.path("payload");

            switch (eventType) {
                case "ORDER_CREATED" -> handleOrderCreated(payload);
                case "ORDER_CANCELLED" -> handleOrderCancelled(payload);
                default -> log.debug("Ignoring event type: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Failed to process order event: {}", message, e);
        }
    }

    private void handleOrderCreated(JsonNode payload) {
        JsonNode items = payload.path("items");
        if (items.isArray()) {
            for (JsonNode item : items) {
                long productId = item.path("productId").asLong();
                int quantity = item.path("quantity").asInt();
                String orderId = payload.path("orderId").asText();
                inventoryService.reserveStock(InventoryRequest.Reserve.builder()
                        .productId(productId).quantity(quantity).orderId(orderId).build());
            }
        }
    }

    private void handleOrderCancelled(JsonNode payload) {
        JsonNode items = payload.path("items");
        if (items.isArray()) {
            for (JsonNode item : items) {
                long productId = item.path("productId").asLong();
                int quantity = item.path("quantity").asInt();
                String orderId = payload.path("orderId").asText();
                inventoryService.cancelReservation(productId, quantity, orderId);
            }
        }
    }
}
