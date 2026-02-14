package com.livemart.inventory.service;

import com.livemart.common.event.DomainEvent;
import com.livemart.common.event.EventPublisher;
import com.livemart.inventory.domain.*;
import com.livemart.inventory.dto.*;
import com.livemart.inventory.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository movementRepository;
    private final RedissonClient redissonClient;
    private final EventPublisher eventPublisher;

    @Transactional
    public InventoryResponse createInventory(InventoryRequest.Create request) {
        if (inventoryRepository.existsByProductId(request.getProductId())) {
            throw new IllegalStateException("Inventory already exists for product: " + request.getProductId());
        }

        Inventory inventory = Inventory.builder()
                .productId(request.getProductId())
                .productName(request.getProductName())
                .warehouseCode(request.getWarehouseCode())
                .availableQuantity(request.getInitialQuantity())
                .reservedQuantity(0)
                .reorderPoint(request.getReorderPoint())
                .reorderQuantity(request.getReorderQuantity())
                .safetyStock(request.getSafetyStock())
                .build();

        inventory = inventoryRepository.save(inventory);

        recordMovement(inventory.getProductId(), StockMovement.MovementType.RESTOCK,
                request.getInitialQuantity(), 0, request.getInitialQuantity(), null, "Initial stock");

        return InventoryResponse.from(inventory);
    }

    @Transactional
    public InventoryResponse reserveStock(InventoryRequest.Reserve request) {
        RLock lock = redissonClient.getLock("inventory:lock:" + request.getProductId());
        try {
            if (!lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Could not acquire lock for product: " + request.getProductId());
            }

            Inventory inventory = getInventoryByProductId(request.getProductId());
            int prev = inventory.getAvailableQuantity();
            inventory.reserve(request.getQuantity());
            inventory = inventoryRepository.save(inventory);

            recordMovement(request.getProductId(), StockMovement.MovementType.RESERVATION,
                    request.getQuantity(), prev, inventory.getAvailableQuantity(),
                    request.getOrderId(), "Stock reserved for order");

            publishStockEvent(inventory, "STOCK_RESERVED");
            return InventoryResponse.from(inventory);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Lock acquisition interrupted", e);
        } finally {
            if (lock.isHeldByCurrentThread()) lock.unlock();
        }
    }

    @Transactional
    public InventoryResponse cancelReservation(Long productId, int quantity, String orderId) {
        Inventory inventory = getInventoryByProductId(productId);
        int prev = inventory.getAvailableQuantity();
        inventory.cancelReservation(quantity);
        inventory = inventoryRepository.save(inventory);

        recordMovement(productId, StockMovement.MovementType.RESERVATION_CANCEL,
                quantity, prev, inventory.getAvailableQuantity(), orderId, "Reservation cancelled");

        publishStockEvent(inventory, "STOCK_RELEASED");
        return InventoryResponse.from(inventory);
    }

    @Transactional
    public InventoryResponse restockInventory(InventoryRequest.Restock request) {
        Inventory inventory = getInventoryByProductId(request.getProductId());
        int prev = inventory.getAvailableQuantity();
        inventory.restock(request.getQuantity());
        inventory = inventoryRepository.save(inventory);

        recordMovement(request.getProductId(), StockMovement.MovementType.RESTOCK,
                request.getQuantity(), prev, inventory.getAvailableQuantity(), null, request.getReason());

        publishStockEvent(inventory, "STOCK_RESTOCKED");
        return InventoryResponse.from(inventory);
    }

    @Transactional(readOnly = true)
    public InventoryResponse getByProductId(Long productId) {
        return InventoryResponse.from(getInventoryByProductId(productId));
    }

    @Transactional(readOnly = true)
    public List<InventoryResponse> getLowStockItems() {
        return inventoryRepository.findByStatus(InventoryStatus.LOW_STOCK).stream()
                .map(InventoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<InventoryResponse> getItemsNeedingReorder() {
        return inventoryRepository.findNeedingReorder().stream()
                .map(InventoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public boolean checkAvailability(Long productId, int quantity) {
        return inventoryRepository.findByProductId(productId)
                .map(inv -> inv.canFulfill(quantity))
                .orElse(false);
    }

    private Inventory getInventoryByProductId(Long productId) {
        return inventoryRepository.findByProductId(productId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for product: " + productId));
    }

    private void recordMovement(Long productId, StockMovement.MovementType type,
                                int qty, int prev, int newQty, String refId, String reason) {
        movementRepository.save(StockMovement.builder()
                .productId(productId).movementType(type).quantity(qty)
                .previousQuantity(prev).newQuantity(newQty)
                .referenceId(refId).reason(reason).build());
    }

    private void publishStockEvent(Inventory inventory, String eventType) {
        eventPublisher.publish("inventory-events", DomainEvent.builder()
                .aggregateType("Inventory")
                .aggregateId(String.valueOf(inventory.getProductId()))
                .eventType(eventType)
                .payload("{\"productId\":" + inventory.getProductId() +
                         ",\"available\":" + inventory.getAvailableQuantity() +
                         ",\"status\":\"" + inventory.getStatus() + "\"}")
                .build());
    }
}
