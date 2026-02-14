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

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxProcessor {

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void processOutbox() {
        List<OutboxEvent> events = outboxRepository.findPendingEvents();
        for (OutboxEvent event : events) {
            try {
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload())
                        .whenComplete((result, ex) -> {
                            if (ex != null) {
                                log.error("Failed to send outbox event to Kafka: {}", event.getId(), ex);
                            }
                        });
                outboxRepository.markAsCompleted(event.getId(), Instant.now());
                log.debug("Outbox event processed: id={}, type={}", event.getId(), event.getEventType());
            } catch (Exception e) {
                log.error("Failed to process outbox event: {}", event.getId(), e);
                outboxRepository.markAsFailed(event.getId());
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
