package com.livemart.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DomainEvent {
    @Builder.Default
    private String eventId = UUID.randomUUID().toString();
    private String aggregateType;
    private String aggregateId;
    private String eventType;
    private String payload;
    @Builder.Default
    private Instant occurredAt = Instant.now();
    private String correlationId;
    private String causationId;
    private int version;
}
