package com.livemart.common.outbox;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.util.concurrent.SettableListenableFuture;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OutboxProcessor")
class OutboxProcessorTest {

    @Mock
    private OutboxEventRepository outboxRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    @InjectMocks
    private OutboxProcessor outboxProcessor;

    private OutboxEvent pendingEvent;

    @BeforeEach
    void setUp() {
        pendingEvent = OutboxEvent.builder()
                .id(1L)
                .aggregateId("order-123")
                .aggregateType("Order")
                .eventType("ORDER_CREATED")
                .topic("order-events")
                .payload("{\"orderId\":\"order-123\"}")
                .retryCount(0)
                .build();
    }

    @Nested
    @DisplayName("processOutbox()")
    class ProcessOutbox {

        @Test
        @DisplayName("성공: 이벤트를 Kafka로 전송하고 COMPLETED 마킹")
        void success_sendsEventAndMarksCompleted() throws Exception {
            // given
            given(outboxRepository.findPendingEvents()).willReturn(List.of(pendingEvent));
            var future = CompletableFuture.completedFuture(mock(org.springframework.kafka.support.SendResult.class));
            given(kafkaTemplate.send(anyString(), anyString(), anyString()))
                    .willReturn(future);

            // when
            outboxProcessor.processOutbox();

            // then
            then(kafkaTemplate).should().send("order-events", "order-123", pendingEvent.getPayload());
            ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);
            then(outboxRepository).should().markAsCompleted(eq(1L), captor.capture());
            assertThat(captor.getValue()).isBeforeOrEqualTo(Instant.now());
        }

        @Test
        @DisplayName("실패: Kafka 전송 실패 시 FAILED 마킹")
        void failure_marksAsFailed_whenKafkaThrows() {
            // given
            given(outboxRepository.findPendingEvents()).willReturn(List.of(pendingEvent));
            given(kafkaTemplate.send(anyString(), anyString(), anyString()))
                    .willThrow(new RuntimeException("Kafka unavailable"));

            // when
            outboxProcessor.processOutbox();

            // then
            then(outboxRepository).should().markAsFailed(1L);
            then(outboxRepository).should(never()).markAsCompleted(anyLong(), any());
        }

        @Test
        @DisplayName("재시도 한도 초과(retryCount=4): 영구 실패 로그 출력 및 FAILED 마킹")
        void permanentFailure_whenRetryCountReachesMax() {
            // given
            OutboxEvent maxRetryEvent = OutboxEvent.builder()
                    .id(2L)
                    .aggregateId("order-456")
                    .aggregateType("Order")
                    .eventType("ORDER_CREATED")
                    .topic("order-events")
                    .payload("{}")
                    .retryCount(4)
                    .build();
            given(outboxRepository.findPendingEvents()).willReturn(List.of(maxRetryEvent));
            given(kafkaTemplate.send(anyString(), anyString(), anyString()))
                    .willThrow(new RuntimeException("Kafka still down"));

            // when
            outboxProcessor.processOutbox();

            // then — markAsFailed 호출, COMPLETED는 없음
            then(outboxRepository).should().markAsFailed(2L);
            then(outboxRepository).should(never()).markAsCompleted(anyLong(), any());
        }

        @Test
        @DisplayName("대기 이벤트가 없으면 아무것도 하지 않음")
        void noOp_whenNoPendingEvents() {
            given(outboxRepository.findPendingEvents()).willReturn(List.of());

            outboxProcessor.processOutbox();

            then(kafkaTemplate).shouldHaveNoInteractions();
        }

        @Test
        @DisplayName("여러 이벤트: 각각 독립적으로 처리 (첫 번째 실패가 두 번째에 영향 없음)")
        void multipleEvents_eachProcessedIndependently() throws Exception {
            // given
            OutboxEvent event2 = OutboxEvent.builder()
                    .id(2L).aggregateId("order-456").aggregateType("Order")
                    .eventType("ORDER_PAID").topic("payment-events")
                    .payload("{}").retryCount(0).build();

            var successFuture = CompletableFuture.completedFuture(
                    mock(org.springframework.kafka.support.SendResult.class));
            given(outboxRepository.findPendingEvents()).willReturn(List.of(pendingEvent, event2));
            given(kafkaTemplate.send(eq("order-events"), anyString(), anyString()))
                    .willThrow(new RuntimeException("first fails"));
            given(kafkaTemplate.send(eq("payment-events"), anyString(), anyString()))
                    .willReturn(successFuture);

            // when
            outboxProcessor.processOutbox();

            // then
            then(outboxRepository).should().markAsFailed(1L);
            then(outboxRepository).should().markAsCompleted(eq(2L), any());
        }
    }

    @Nested
    @DisplayName("cleanupProcessedEvents()")
    class CleanupProcessedEvents {

        @Test
        @DisplayName("7일 이전 완료 이벤트 삭제")
        void deletesCompletedEventsOlderThan7Days() {
            // when
            outboxProcessor.cleanupProcessedEvents();

            // then
            ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);
            then(outboxRepository).should().deleteCompletedBefore(captor.capture());
            Instant cutoff = captor.getValue();
            assertThat(cutoff).isBefore(Instant.now());
            // 약 7일 전 (±1분 허용)
            assertThat(cutoff).isAfter(Instant.now().minusSeconds(7 * 24 * 3600 + 60));
        }
    }
}
