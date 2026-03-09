package com.livemart.common.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxProcessor {

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    private static final long KAFKA_SEND_TIMEOUT_SECONDS = 5;

    /**
     * Outbox 이벤트 처리 (1초 간격)
     *
     * 수정: kafkaTemplate.send().get() 로 Kafka 전송 결과 확인 후 상태 업데이트
     * (기존: 비동기 whenComplete 무시하고 즉시 COMPLETED 표시 → 메시지 유실 가능)
     */
    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void processOutbox() {
        List<OutboxEvent> events = outboxRepository.findPendingEvents();
        for (OutboxEvent event : events) {
            try {
                // 동기 전송 + 타임아웃: Kafka가 수신 확인할 때까지 대기
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload())
                        .get(KAFKA_SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);

                outboxRepository.markAsCompleted(event.getId(), Instant.now());
                log.debug("Outbox event sent: id={}, type={}, topic={}",
                        event.getId(), event.getEventType(), event.getTopic());

            } catch (Exception e) {
                log.error("Outbox event send failed (retryCount={}): id={}, type={}",
                        event.getRetryCount(), event.getId(), event.getEventType(), e);
                outboxRepository.markAsFailed(event.getId());
                // retryCount가 5에 도달하면 findPendingEvents()에서 제외됨
                if (event.getRetryCount() >= 4) {
                    log.error("[OUTBOX-ALERT] Event permanently failed after max retries: id={}, type={}, aggregateId={}. " +
                              "Manual intervention required.",
                              event.getId(), event.getEventType(), event.getAggregateId());
                }
            }
        }
    }

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanupProcessedEvents() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        outboxRepository.deleteCompletedBefore(cutoff);
        log.info("Cleaned up completed outbox events older than 7 days");
    }
}
