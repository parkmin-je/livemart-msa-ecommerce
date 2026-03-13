package com.livemart.common.eventsourcing;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JpaEventStore")
class JpaEventStoreTest {

    @Mock private StoredEventRepository repository;
    @Mock private AggregateSnapshotRepository snapshotRepository;

    @InjectMocks
    private JpaEventStore eventStore;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void injectObjectMapper() throws Exception {
        var field = JpaEventStore.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(eventStore, objectMapper);
    }

    @Nested
    @DisplayName("save()")
    class Save {

        @Test
        @DisplayName("낙관적 동시성 충돌 → IllegalStateException")
        void throwsOnVersionConflict() {
            given(repository.existsByAggregateIdAndVersion("agg-1", 1L)).willReturn(true);

            assertThatThrownBy(() ->
                    eventStore.save("agg-1", "Order", "ORDER_CREATED", 1L, Map.of("key", "val")))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Optimistic concurrency conflict");
        }

        @Test
        @DisplayName("정상 저장: StoredEvent 빌드 후 repository.save() 호출")
        void savesEventSuccessfully() throws Exception {
            given(repository.existsByAggregateIdAndVersion(anyString(), anyLong())).willReturn(false);

            eventStore.save("agg-1", "Order", "ORDER_CREATED", 1L, Map.of("orderId", "order-123"));

            ArgumentCaptor<StoredEvent> captor = ArgumentCaptor.forClass(StoredEvent.class);
            then(repository).should().save(captor.capture());
            StoredEvent saved = captor.getValue();
            assertThat(saved.getAggregateId()).isEqualTo("agg-1");
            assertThat(saved.getEventType()).isEqualTo("ORDER_CREATED");
            assertThat(saved.getVersion()).isEqualTo(1L);
            assertThat(saved.getPayload()).contains("orderId");
        }
    }

    @Nested
    @DisplayName("getEvents()")
    class GetEvents {

        @Test
        @DisplayName("aggregateId로 버전 오름차순 이벤트 반환")
        void returnsEventsInOrder() {
            StoredEvent e1 = StoredEvent.builder().aggregateId("agg-1").version(1L).build();
            StoredEvent e2 = StoredEvent.builder().aggregateId("agg-1").version(2L).build();
            given(repository.findByAggregateIdOrderByVersionAsc("agg-1")).willReturn(List.of(e1, e2));

            List<StoredEvent> result = eventStore.getEvents("agg-1");

            assertThat(result).hasSize(2);
            assertThat(result.get(0).getVersion()).isEqualTo(1L);
            assertThat(result.get(1).getVersion()).isEqualTo(2L);
        }
    }

    @Nested
    @DisplayName("saveSnapshot() / getLatestSnapshot()")
    class Snapshot {

        @Test
        @DisplayName("스냅샷 저장 + 오래된 스냅샷 정리 (keepCount=3 초과 시)")
        void savesSnapshotAndCleansOld() {
            // 이미 4개의 스냅샷이 있을 때
            List<AggregateSnapshot> existing = List.of(
                    mockSnapshot(1L), mockSnapshot(2L), mockSnapshot(3L), mockSnapshot(4L));
            given(snapshotRepository.findAllByAggregate("agg-1", "Order")).willReturn(existing);

            eventStore.saveSnapshot("agg-1", "Order", 10L, Map.of("status", "CONFIRMED"));

            then(snapshotRepository).should().save(any(AggregateSnapshot.class));
            // 4개 - keep 3 = 1개 삭제
            ArgumentCaptor<List<AggregateSnapshot>> deleteCaptor = ArgumentCaptor.forClass(List.class);
            then(snapshotRepository).should().deleteAll(deleteCaptor.capture());
            assertThat(deleteCaptor.getValue()).hasSize(1);
        }

        @Test
        @DisplayName("최신 스냅샷 없으면 Optional.empty() 반환")
        void returnsEmptyWhenNoSnapshot() {
            given(snapshotRepository.findLatestSnapshot("agg-1", "Order")).willReturn(Optional.empty());

            Optional<AggregateSnapshot> result = eventStore.getLatestSnapshot("agg-1", "Order");

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("loadWithSnapshot()")
    class LoadWithSnapshot {

        @Test
        @DisplayName("스냅샷 있을 때: 스냅샷 이후 델타 이벤트만 조회")
        void loadsWithSnapshot_returnsDeltaEventsOnly() {
            AggregateSnapshot snap = mockSnapshot(5L);
            given(snapshotRepository.findLatestSnapshot("agg-1", "Order")).willReturn(Optional.of(snap));
            StoredEvent delta = StoredEvent.builder().version(6L).build();
            given(repository.findFromVersion("agg-1", 6L)).willReturn(List.of(delta));

            JpaEventStore.SnapshotResult result = eventStore.loadWithSnapshot("agg-1", "Order");

            assertThat(result.hasSnapshot()).isTrue();
            assertThat(result.snapshot().get().getVersion()).isEqualTo(5L);
            assertThat(result.deltaEvents()).hasSize(1);
            then(repository).should().findFromVersion("agg-1", 6L);
            then(repository).should(never()).findByAggregateIdOrderByVersionAsc(anyString());
        }

        @Test
        @DisplayName("스냅샷 없을 때: 전체 이벤트 조회")
        void loadsAllEvents_whenNoSnapshot() {
            given(snapshotRepository.findLatestSnapshot(anyString(), anyString())).willReturn(Optional.empty());
            given(repository.findByAggregateIdOrderByVersionAsc("agg-1")).willReturn(List.of(
                    StoredEvent.builder().version(1L).build(),
                    StoredEvent.builder().version(2L).build()
            ));

            JpaEventStore.SnapshotResult result = eventStore.loadWithSnapshot("agg-1", "Order");

            assertThat(result.hasSnapshot()).isFalse();
            assertThat(result.deltaEvents()).hasSize(2);
        }
    }

    @Nested
    @DisplayName("shouldCreateSnapshot()")
    class ShouldCreateSnapshot {

        @Test
        @DisplayName("delta 이벤트 >= 50 → true")
        void returnsTrueWhenThresholdReached() {
            given(snapshotRepository.findLatestSnapshot(anyString(), anyString())).willReturn(Optional.empty());
            List<StoredEvent> fiftyEvents = java.util.Collections.nCopies(50,
                    StoredEvent.builder().version(1L).build());
            given(repository.findFromVersion(anyString(), eq(1L))).willReturn(fiftyEvents);

            assertThat(eventStore.shouldCreateSnapshot("agg-1", "Order")).isTrue();
        }

        @Test
        @DisplayName("delta 이벤트 < 50 → false")
        void returnsFalseWhenBelowThreshold() {
            given(snapshotRepository.findLatestSnapshot(anyString(), anyString())).willReturn(Optional.empty());
            given(repository.findFromVersion(anyString(), eq(1L))).willReturn(
                    java.util.Collections.nCopies(10, StoredEvent.builder().version(1L).build()));

            assertThat(eventStore.shouldCreateSnapshot("agg-1", "Order")).isFalse();
        }
    }

    private AggregateSnapshot mockSnapshot(long version) {
        return AggregateSnapshot.builder()
                .aggregateId("agg-1")
                .aggregateType("Order")
                .version(version)
                .stateJson("{}")
                .build();
    }
}
