package com.livemart.inventory.repository;

import com.livemart.inventory.domain.Inventory;
import com.livemart.inventory.domain.InventoryStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByProductId(Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.productId = :productId")
    Optional<Inventory> findByProductIdWithLock(@Param("productId") Long productId);

    List<Inventory> findByStatus(InventoryStatus status);

    @Query("SELECT i FROM Inventory i WHERE i.availableQuantity <= i.reorderPoint AND i.status != 'DISCONTINUED'")
    List<Inventory> findNeedingReorder();

    @Query("SELECT i FROM Inventory i WHERE i.warehouseCode = :code")
    List<Inventory> findByWarehouse(@Param("code") String warehouseCode);

    boolean existsByProductId(Long productId);
}
