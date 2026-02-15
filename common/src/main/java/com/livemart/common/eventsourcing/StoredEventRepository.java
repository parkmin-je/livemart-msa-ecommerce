package com.livemart.common.eventsourcing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface StoredEventRepository extends JpaRepository<StoredEvent, UUID> {

    List<StoredEvent> findByAggregateIdOrderByVersionAsc(String aggregateId);

    @Query("SELECT e FROM StoredEvent e WHERE e.aggregateId = :aggregateId AND e.version >= :fromVersion ORDER BY e.version ASC")
    List<StoredEvent> findFromVersion(@Param("aggregateId") String aggregateId, @Param("fromVersion") long fromVersion);

    @Query("SELECT e FROM StoredEvent e WHERE e.aggregateId = :aggregateId AND e.occurredAt <= :until ORDER BY e.version ASC")
    List<StoredEvent> findUntil(@Param("aggregateId") String aggregateId, @Param("until") Instant until);

    @Query("SELECT COUNT(DISTINCT e.aggregateId) FROM StoredEvent e")
    long countDistinctAggregates();

    @Query("SELECT e.eventType, COUNT(e) FROM StoredEvent e GROUP BY e.eventType")
    List<Object[]> countByEventType();

    boolean existsByAggregateIdAndVersion(String aggregateId, long version);
}
