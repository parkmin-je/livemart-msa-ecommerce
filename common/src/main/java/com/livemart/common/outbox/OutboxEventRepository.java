package com.livemart.common.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query("SELECT e FROM OutboxEvent e WHERE e.status = 'PENDING' OR " +
           "(e.status = 'FAILED' AND e.retryCount < 5) ORDER BY e.createdAt ASC")
    List<OutboxEvent> findPendingEvents();

    @Modifying
    @Query("UPDATE OutboxEvent e SET e.status = 'COMPLETED', e.processedAt = :now WHERE e.id = :id")
    void markAsCompleted(@Param("id") UUID id, @Param("now") Instant now);

    @Modifying
    @Query("UPDATE OutboxEvent e SET e.status = 'FAILED', e.retryCount = e.retryCount + 1 WHERE e.id = :id")
    void markAsFailed(@Param("id") UUID id);

    @Modifying
    @Query("DELETE FROM OutboxEvent e WHERE e.status = 'COMPLETED' AND e.processedAt < :before")
    void deleteCompletedBefore(@Param("before") Instant before);
}
