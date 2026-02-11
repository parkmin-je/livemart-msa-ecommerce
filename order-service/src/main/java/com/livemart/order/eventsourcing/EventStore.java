package com.livemart.order.eventsourcing;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Event Store (이벤트 저장소)
 *
 * Event Sourcing 패턴 구현:
 * - 모든 상태 변경을 이벤트로 저장
 * - 이벤트 스트림에서 현재 상태 재구성
 * - 시간 여행 (Time Travel) 가능
 * - CQRS와 함께 사용
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventStore {

    // 집합체별 이벤트 스트림 저장소
    private final Map<String, List<DomainEvent>> eventStreams = new ConcurrentHashMap<>();

    // 스냅샷 저장소 (성능 최적화)
    private final Map<String, Snapshot> snapshots = new ConcurrentHashMap<>();

    private static final int SNAPSHOT_INTERVAL = 10; // 10개 이벤트마다 스냅샷

    /**
     * 이벤트 저장
     */
    public void save(String aggregateId, DomainEvent event) {
        eventStreams.computeIfAbsent(aggregateId, k -> new ArrayList<>()).add(event);

        log.debug("Event saved: aggregateId={}, eventType={}, version={}",
                  aggregateId, event.eventType(), event.version());

        // 스냅샷 생성 조건 확인
        List<DomainEvent> events = eventStreams.get(aggregateId);
        if (events.size() % SNAPSHOT_INTERVAL == 0) {
            createSnapshot(aggregateId, events);
        }
    }

    /**
     * 이벤트 스트림 조회
     */
    public List<DomainEvent> getEvents(String aggregateId) {
        return eventStreams.getOrDefault(aggregateId, Collections.emptyList());
    }

    /**
     * 특정 버전부터 이벤트 조회
     */
    public List<DomainEvent> getEventsFromVersion(String aggregateId, long fromVersion) {
        return getEvents(aggregateId).stream()
            .filter(event -> event.version() >= fromVersion)
            .toList();
    }

    /**
     * 특정 시점까지의 이벤트 조회 (Time Travel)
     */
    public List<DomainEvent> getEventsUntil(String aggregateId, LocalDateTime until) {
        return getEvents(aggregateId).stream()
            .filter(event -> event.timestamp().isBefore(until) || event.timestamp().isEqual(until))
            .toList();
    }

    /**
     * 이벤트 스트림에서 현재 상태 재구성
     */
    public <T> T reconstruct(String aggregateId, AggregateRoot<T> aggregate) {
        // 스냅샷이 있으면 스냅샷부터 시작
        Snapshot snapshot = snapshots.get(aggregateId);
        List<DomainEvent> events;

        if (snapshot != null) {
            aggregate.loadFromSnapshot(snapshot.state());
            events = getEventsFromVersion(aggregateId, snapshot.version() + 1);
            log.debug("Reconstructing from snapshot: aggregateId={}, snapshotVersion={}",
                      aggregateId, snapshot.version());
        } else {
            events = getEvents(aggregateId);
        }

        // 이벤트 재생 (Event Replay)
        events.forEach(aggregate::apply);

        log.debug("Aggregate reconstructed: aggregateId={}, totalEvents={}",
                  aggregateId, events.size());

        return aggregate.getState();
    }

    /**
     * 특정 시점의 상태 재구성 (Time Travel)
     */
    public <T> T reconstructAtPointInTime(String aggregateId, LocalDateTime pointInTime,
                                           AggregateRoot<T> aggregate) {
        List<DomainEvent> events = getEventsUntil(aggregateId, pointInTime);
        events.forEach(aggregate::apply);

        log.info("Time travel: aggregateId={}, pointInTime={}, eventsReplayed={}",
                 aggregateId, pointInTime, events.size());

        return aggregate.getState();
    }

    /**
     * 스냅샷 생성 (성능 최적화)
     */
    private void createSnapshot(String aggregateId, List<DomainEvent> events) {
        if (events.isEmpty()) return;

        DomainEvent lastEvent = events.get(events.size() - 1);

        // 간단한 스냅샷 (실제로는 집합체 상태를 직렬화)
        Snapshot snapshot = new Snapshot(
            aggregateId,
            lastEvent.version(),
            lastEvent.timestamp(),
            Map.of("eventCount", events.size())
        );

        snapshots.put(aggregateId, snapshot);

        log.info("Snapshot created: aggregateId={}, version={}", aggregateId, lastEvent.version());
    }

    /**
     * 이벤트 스트림 통계
     */
    public EventStoreStats getStats() {
        int totalAggregates = eventStreams.size();
        long totalEvents = eventStreams.values().stream()
            .mapToLong(List::size)
            .sum();
        int totalSnapshots = snapshots.size();

        return new EventStoreStats(
            totalAggregates,
            totalEvents,
            totalSnapshots,
            (double) totalEvents / Math.max(1, totalAggregates)
        );
    }

    /**
     * 이벤트 타입별 통계
     */
    public Map<String, Long> getEventTypeStats() {
        return eventStreams.values().stream()
            .flatMap(List::stream)
            .collect(Collectors.groupingBy(
                DomainEvent::eventType,
                Collectors.counting()
            ));
    }

    /**
     * 이벤트 스트림 검증 (일관성 체크)
     */
    public boolean validateEventStream(String aggregateId) {
        List<DomainEvent> events = getEvents(aggregateId);

        for (int i = 0; i < events.size(); i++) {
            DomainEvent event = events.get(i);

            // 버전이 순차적인지 확인
            if (event.version() != i + 1) {
                log.error("Version mismatch: aggregateId={}, expected={}, actual={}",
                          aggregateId, i + 1, event.version());
                return false;
            }

            // 타임스탬프가 순차적인지 확인
            if (i > 0 && event.timestamp().isBefore(events.get(i - 1).timestamp())) {
                log.error("Timestamp order violation: aggregateId={}", aggregateId);
                return false;
            }
        }

        return true;
    }

    // Records & Interfaces

    public record DomainEvent(
        String eventId,
        String aggregateId,
        String eventType,
        long version,
        LocalDateTime timestamp,
        Map<String, Object> payload
    ) {}

    public record Snapshot(
        String aggregateId,
        long version,
        LocalDateTime timestamp,
        Map<String, Object> state
    ) {}

    public record EventStoreStats(
        int totalAggregates,
        long totalEvents,
        int totalSnapshots,
        double avgEventsPerAggregate
    ) {}

    /**
     * 집합체 루트 인터페이스
     */
    public interface AggregateRoot<T> {
        void apply(DomainEvent event);
        T getState();
        void loadFromSnapshot(Map<String, Object> snapshot);
    }
}
