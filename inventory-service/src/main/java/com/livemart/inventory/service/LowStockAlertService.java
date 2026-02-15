package com.livemart.inventory.service;

import com.livemart.inventory.domain.Inventory;
import com.livemart.inventory.domain.InventoryStatus;
import com.livemart.inventory.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LowStockAlertService {

    private final InventoryRepository inventoryRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String STOCK_ALERT_TOPIC = "stock-alert-events";

    @Scheduled(fixedRate = 300000) // 5분마다 체크
    @Transactional(readOnly = true)
    public void checkLowStockItems() {
        List<Inventory> lowStockItems = inventoryRepository.findByStatus(InventoryStatus.LOW_STOCK);
        List<Inventory> outOfStockItems = inventoryRepository.findByStatus(InventoryStatus.OUT_OF_STOCK);

        for (Inventory item : lowStockItems) {
            publishStockAlert(item, "LOW_STOCK");
        }

        for (Inventory item : outOfStockItems) {
            publishStockAlert(item, "OUT_OF_STOCK");
        }

        if (!lowStockItems.isEmpty() || !outOfStockItems.isEmpty()) {
            log.info("재고 알림 발송: lowStock={}, outOfStock={}", lowStockItems.size(), outOfStockItems.size());
        }
    }

    public void checkAndAlertIfLow(Inventory inventory) {
        if (inventory.getStatus() == InventoryStatus.LOW_STOCK) {
            publishStockAlert(inventory, "LOW_STOCK");
        } else if (inventory.getStatus() == InventoryStatus.OUT_OF_STOCK) {
            publishStockAlert(inventory, "OUT_OF_STOCK");
        }
    }

    private void publishStockAlert(Inventory inventory, String alertType) {
        Map<String, Object> alert = new HashMap<>();
        alert.put("eventType", alertType);
        alert.put("productId", inventory.getProductId());
        alert.put("productName", inventory.getProductName());
        alert.put("warehouseCode", inventory.getWarehouseCode());
        alert.put("availableQuantity", inventory.getAvailableQuantity());
        alert.put("reorderPoint", inventory.getReorderPoint());
        alert.put("safetyStock", inventory.getSafetyStock());
        alert.put("occurredAt", LocalDateTime.now().toString());

        kafkaTemplate.send(STOCK_ALERT_TOPIC, String.valueOf(inventory.getProductId()), alert);
        log.info("재고 알림 이벤트 발행: type={}, productId={}, available={}",
                alertType, inventory.getProductId(), inventory.getAvailableQuantity());
    }
}
