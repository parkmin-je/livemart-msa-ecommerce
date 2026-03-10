package com.livemart.common.eventsourcing;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Aggregate Snapshot 엔티티
 * 이벤트가 SNAPSHOT_THRESHOLD 개 이상 쌓이면 스냅샷을 생성하여
 * 재로딩 시 전체 이벤트를 재생하는 대신 스냅샷 + 이후 이벤트만 재생
 */
@Entity
@Table(name = "aggregate_snapshots", indexes = {
    @Index(name = "idx_snapshot_aggregate", columnList = "aggregateId, aggregateType"),
    @Index(name = "idx_snapshot_version", columnList = "aggregateId, version")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AggregateSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String aggregateId;

    @Column(nullable = false)
    private String aggregateType;

    @Column(nullable = false)
    private long version;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String stateJson;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
