package com.livemart.inventory.service;

import com.livemart.common.event.EventPublisher;
import com.livemart.inventory.domain.*;
import com.livemart.inventory.dto.*;
import com.livemart.inventory.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InventoryService 단위 테스트")
class InventoryServiceTest {

    @InjectMocks
    private InventoryService inventoryService;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private StockMovementRepository movementRepository;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private EventPublisher eventPublisher;

    @Mock
    private LowStockAlertService lowStockAlertService;

    @Mock
    private RLock rLock;

    @Nested
    @DisplayName("재고 생성")
    class CreateInventoryTest {

        @Test
        @DisplayName("재고 정상 생성")
        void createInventory_success() {
            InventoryRequest.Create request = InventoryRequest.Create.builder()
                    .productId(1L)
                    .productName("테스트 상품")
                    .warehouseCode("WH-001")
                    .initialQuantity(100)
                    .reorderPoint(10)
                    .reorderQuantity(50)
                    .safetyStock(20)
                    .build();

            given(inventoryRepository.existsByProductId(1L)).willReturn(false);
            given(inventoryRepository.save(any(Inventory.class))).willAnswer(inv -> inv.getArgument(0));

            InventoryResponse response = inventoryService.createInventory(request);

            assertThat(response).isNotNull();
            assertThat(response.getProductId()).isEqualTo(1L);
            assertThat(response.getAvailableQuantity()).isEqualTo(100);
            then(movementRepository).should().save(any(StockMovement.class));
        }

        @Test
        @DisplayName("이미 존재하는 상품 재고 생성 시 예외")
        void createInventory_alreadyExists() {
            InventoryRequest.Create request = InventoryRequest.Create.builder()
                    .productId(1L)
                    .build();

            given(inventoryRepository.existsByProductId(1L)).willReturn(true);

            assertThatThrownBy(() -> inventoryService.createInventory(request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already exists");
        }
    }

    @Nested
    @DisplayName("재고 예약")
    class ReserveStockTest {

        @Test
        @DisplayName("재고 예약 성공")
        void reserveStock_success() throws InterruptedException {
            Inventory inventory = Inventory.builder()
                    .productId(1L)
                    .productName("테스트 상품")
                    .warehouseCode("WH-001")
                    .availableQuantity(100)
                    .reservedQuantity(0)
                    .safetyStock(10)
                    .build();

            InventoryRequest.Reserve request = InventoryRequest.Reserve.builder()
                    .productId(1L)
                    .quantity(5)
                    .orderId("ORD-001")
                    .build();

            given(redissonClient.getLock(anyString())).willReturn(rLock);
            given(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).willReturn(true);
            given(rLock.isHeldByCurrentThread()).willReturn(true);
            given(inventoryRepository.findByProductId(1L)).willReturn(Optional.of(inventory));
            given(inventoryRepository.save(any(Inventory.class))).willAnswer(inv -> inv.getArgument(0));

            InventoryResponse response = inventoryService.reserveStock(request);

            assertThat(response.getAvailableQuantity()).isEqualTo(95);
            assertThat(response.getReservedQuantity()).isEqualTo(5);
            then(lowStockAlertService).should().checkAndAlertIfLow(any(Inventory.class));
        }

        @Test
        @DisplayName("재고 부족 시 예외")
        void reserveStock_insufficientStock() throws InterruptedException {
            Inventory inventory = Inventory.builder()
                    .productId(1L)
                    .productName("테스트 상품")
                    .availableQuantity(3)
                    .reservedQuantity(0)
                    .build();

            InventoryRequest.Reserve request = InventoryRequest.Reserve.builder()
                    .productId(1L)
                    .quantity(10)
                    .orderId("ORD-002")
                    .build();

            given(redissonClient.getLock(anyString())).willReturn(rLock);
            given(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).willReturn(true);
            given(rLock.isHeldByCurrentThread()).willReturn(true);
            given(inventoryRepository.findByProductId(1L)).willReturn(Optional.of(inventory));

            assertThatThrownBy(() -> inventoryService.reserveStock(request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Insufficient stock");
        }
    }

    @Nested
    @DisplayName("재고 취소/보충")
    class CancelAndRestockTest {

        @Test
        @DisplayName("예약 취소 시 재고 복구")
        void cancelReservation_success() {
            Inventory inventory = Inventory.builder()
                    .productId(1L)
                    .productName("테스트 상품")
                    .availableQuantity(95)
                    .reservedQuantity(5)
                    .safetyStock(10)
                    .build();

            given(inventoryRepository.findByProductId(1L)).willReturn(Optional.of(inventory));
            given(inventoryRepository.save(any(Inventory.class))).willAnswer(inv -> inv.getArgument(0));

            InventoryResponse response = inventoryService.cancelReservation(1L, 5, "ORD-001");

            assertThat(response.getAvailableQuantity()).isEqualTo(100);
            assertThat(response.getReservedQuantity()).isEqualTo(0);
        }

        @Test
        @DisplayName("재입고 성공")
        void restockInventory_success() {
            Inventory inventory = Inventory.builder()
                    .productId(1L)
                    .productName("테스트 상품")
                    .availableQuantity(5)
                    .reservedQuantity(0)
                    .safetyStock(10)
                    .build();

            InventoryRequest.Restock request = InventoryRequest.Restock.builder()
                    .productId(1L)
                    .quantity(50)
                    .reason("정기 입고")
                    .build();

            given(inventoryRepository.findByProductId(1L)).willReturn(Optional.of(inventory));
            given(inventoryRepository.save(any(Inventory.class))).willAnswer(inv -> inv.getArgument(0));

            InventoryResponse response = inventoryService.restockInventory(request);

            assertThat(response.getAvailableQuantity()).isEqualTo(55);
        }
    }

    @Nested
    @DisplayName("재고 조회")
    class QueryTest {

        @Test
        @DisplayName("상품별 재고 조회")
        void getByProductId_success() {
            Inventory inventory = Inventory.builder()
                    .productId(1L)
                    .productName("테스트 상품")
                    .availableQuantity(50)
                    .reservedQuantity(10)
                    .build();

            given(inventoryRepository.findByProductId(1L)).willReturn(Optional.of(inventory));

            InventoryResponse response = inventoryService.getByProductId(1L);
            assertThat(response.getProductId()).isEqualTo(1L);
            assertThat(response.getAvailableQuantity()).isEqualTo(50);
        }

        @Test
        @DisplayName("존재하지 않는 상품 조회 시 예외")
        void getByProductId_notFound() {
            given(inventoryRepository.findByProductId(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> inventoryService.getByProductId(999L))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("재고 가용 여부 확인")
        void checkAvailability_success() {
            Inventory inventory = Inventory.builder()
                    .availableQuantity(10)
                    .build();

            given(inventoryRepository.findByProductId(1L)).willReturn(Optional.of(inventory));

            assertThat(inventoryService.checkAvailability(1L, 5)).isTrue();
            assertThat(inventoryService.checkAvailability(1L, 15)).isFalse();
        }

        @Test
        @DisplayName("저수량 재고 목록 조회")
        void getLowStockItems_success() {
            List<Inventory> lowStockItems = List.of(
                    Inventory.builder().productId(1L).productName("상품A")
                            .availableQuantity(3).reservedQuantity(0).status(InventoryStatus.LOW_STOCK).build(),
                    Inventory.builder().productId(2L).productName("상품B")
                            .availableQuantity(5).reservedQuantity(0).status(InventoryStatus.LOW_STOCK).build()
            );

            given(inventoryRepository.findByStatus(InventoryStatus.LOW_STOCK)).willReturn(lowStockItems);

            List<InventoryResponse> responses = inventoryService.getLowStockItems();
            assertThat(responses).hasSize(2);
        }
    }
}
