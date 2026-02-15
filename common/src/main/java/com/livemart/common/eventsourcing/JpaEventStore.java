package com.livemart.common.eventsourcing;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnBean(StoredEventRepository.class)
public class JpaEventStore {

    private final StoredEventRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void save(String aggregateId, String aggregateType, String eventType,
                     long version, Map<String, Object> payload) {
        if (repository.existsByAggregateIdAndVersion(aggregateId, version)) {
            throw new IllegalStateException(
                    "Optimistic concurrency conflict: aggregate=" + aggregateId + ", version=" + version);
        }

        try {
            StoredEvent event = StoredEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType(aggregateType)
                    .eventType(eventType)
                    .version(version)
                    .payload(objectMapper.writeValueAsString(payload))
                    .build();
            repository.save(event);
            log.debug("Event persisted: aggregate={}, type={}, version={}", aggregateId, eventType, version);
        } catch (Exception e) {
            throw new RuntimeException("Failed to persist event", e);
        }
    }

    @Transactional(readOnly = true)
    public List<StoredEvent> getEvents(String aggregateId) {
        return repository.findByAggregateIdOrderByVersionAsc(aggregateId);
    }

    @Transactional(readOnly = true)
    public List<StoredEvent> getEventsFromVersion(String aggregateId, long fromVersion) {
        return repository.findFromVersion(aggregateId, fromVersion);
    }

    @Transactional(readOnly = true)
    public List<StoredEvent> getEventsUntil(String aggregateId, LocalDateTime until) {
        Instant instant = until.atZone(ZoneId.systemDefault()).toInstant();
        return repository.findUntil(aggregateId, instant);
    }

    public Map<String, Object> deserializePayload(StoredEvent event) {
        try {
            return objectMapper.readValue(event.getPayload(), new TypeReference<>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize event payload", e);
        }
    }

    @Transactional(readOnly = true)
    public EventStoreStats getStats() {
        long totalAggregates = repository.countDistinctAggregates();
        long totalEvents = repository.count();
        double avg = totalAggregates > 0 ? (double) totalEvents / totalAggregates : 0;
        return new EventStoreStats(totalAggregates, totalEvents, avg);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getEventTypeStats() {
        return repository.countByEventType().stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));
    }

    public record EventStoreStats(long totalAggregates, long totalEvents, double avgEventsPerAggregate) {}
}
