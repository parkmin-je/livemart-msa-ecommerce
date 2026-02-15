package com.livemart.common.eventsourcing;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stored_events", indexes = {
        @Index(name = "idx_stored_event_aggregate", columnList = "aggregateId, version"),
        @Index(name = "idx_stored_event_type", columnList = "eventType"),
        @Index(name = "idx_stored_event_timestamp", columnList = "occurredAt")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoredEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String aggregateId;

    @Column(nullable = false)
    private String aggregateType;

    @Column(nullable = false)
    private String eventType;

    @Column(nullable = false)
    private long version;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String payload;

    @Builder.Default
    private Instant occurredAt = Instant.now();

    private String correlationId;

    private String causationId;
}
