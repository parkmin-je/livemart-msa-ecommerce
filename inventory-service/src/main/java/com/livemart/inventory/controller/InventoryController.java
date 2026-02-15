package com.livemart.inventory.controller;

import com.livemart.common.audit.AuditLog;
import com.livemart.common.idempotency.IdempotencyKey;
import com.livemart.inventory.dto.*;
import com.livemart.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory", description = "재고 관리 API")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping
    @IdempotencyKey(prefix = "inventory-create")
    @AuditLog(action = "CREATE", resource = "Inventory")
    @Operation(summary = "재고 등록")
    public ResponseEntity<InventoryResponse> create(@Valid @RequestBody InventoryRequest.Create request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.createInventory(request));
    }

    @PostMapping("/reserve")
    @IdempotencyKey(prefix = "inventory-reserve")
    @AuditLog(action = "RESERVE", resource = "Inventory")
    @Operation(summary = "재고 예약 (주문 시)")
    public ResponseEntity<InventoryResponse> reserve(@Valid @RequestBody InventoryRequest.Reserve request) {
        return ResponseEntity.ok(inventoryService.reserveStock(request));
    }

    @PostMapping("/cancel-reservation")
    @AuditLog(action = "CANCEL_RESERVATION", resource = "Inventory")
    @Operation(summary = "재고 예약 취소")
    public ResponseEntity<InventoryResponse> cancelReservation(
            @RequestParam Long productId,
            @RequestParam int quantity,
            @RequestParam(required = false) String orderId) {
        return ResponseEntity.ok(inventoryService.cancelReservation(productId, quantity, orderId));
    }

    @PostMapping("/restock")
    @IdempotencyKey(prefix = "inventory-restock")
    @AuditLog(action = "RESTOCK", resource = "Inventory")
    @Operation(summary = "재고 입고")
    public ResponseEntity<InventoryResponse> restock(@Valid @RequestBody InventoryRequest.Restock request) {
        return ResponseEntity.ok(inventoryService.restockInventory(request));
    }

    @GetMapping("/product/{productId}")
    @Operation(summary = "상품별 재고 조회")
    public ResponseEntity<InventoryResponse> getByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getByProductId(productId));
    }

    @GetMapping("/check")
    @Operation(summary = "재고 가용성 확인")
    public ResponseEntity<Boolean> checkAvailability(
            @RequestParam Long productId, @RequestParam int quantity) {
        return ResponseEntity.ok(inventoryService.checkAvailability(productId, quantity));
    }

    @GetMapping("/low-stock")
    @Operation(summary = "재고 부족 목록")
    public ResponseEntity<List<InventoryResponse>> getLowStock() {
        return ResponseEntity.ok(inventoryService.getLowStockItems());
    }

    @GetMapping("/reorder-needed")
    @Operation(summary = "재주문 필요 목록")
    public ResponseEntity<List<InventoryResponse>> getReorderNeeded() {
        return ResponseEntity.ok(inventoryService.getItemsNeedingReorder());
    }
}
