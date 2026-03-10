package com.livemart.common.eventsourcing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AggregateSnapshotRepository extends JpaRepository<AggregateSnapshot, Long> {

    /**
     * 특정 aggregate의 가장 최신 스냅샷 조회
     */
    @Query("SELECT s FROM AggregateSnapshot s WHERE s.aggregateId = :aggregateId " +
           "AND s.aggregateType = :aggregateType ORDER BY s.version DESC LIMIT 1")
    Optional<AggregateSnapshot> findLatestSnapshot(
            @Param("aggregateId") String aggregateId,
            @Param("aggregateType") String aggregateType);

    /**
     * 오래된 스냅샷 삭제 (최신 N개만 유지하는 cleanup용)
     */
    @Query("SELECT s FROM AggregateSnapshot s WHERE s.aggregateId = :aggregateId " +
           "AND s.aggregateType = :aggregateType ORDER BY s.version DESC")
    java.util.List<AggregateSnapshot> findAllByAggregate(
            @Param("aggregateId") String aggregateId,
            @Param("aggregateType") String aggregateType);
}
