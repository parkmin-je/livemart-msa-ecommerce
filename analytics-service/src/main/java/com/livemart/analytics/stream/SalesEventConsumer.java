package com.livemart.analytics.stream;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.analytics.domain.DailySalesRecord;
import com.livemart.analytics.repository.DailySalesRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class SalesEventConsumer {

    private final DailySalesRecordRepository dailySalesRecordRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "order-events", groupId = "analytics-sales-consumer")
    @Transactional
    public void consumeOrderEvent(String message) {
        try {
            OrderEventDto event = objectMapper.readValue(message, OrderEventDto.class);

            // ORDER_CREATED 또는 ORDER_CONFIRMED 이벤트만 집계
            if (!"ORDER_CREATED".equals(event.eventType()) && !"ORDER_CONFIRMED".equals(event.eventType())) {
                return;
            }

            BigDecimal amount = event.totalAmount() != null ? event.totalAmount() : BigDecimal.ZERO;
            LocalDate salesDate = event.occurredAt() != null
                    ? event.occurredAt().toLocalDate()
                    : LocalDate.now();

            // Upsert: 해당 날짜 레코드가 없으면 생성, 있으면 누적
            DailySalesRecord record = dailySalesRecordRepository.findBySalesDate(salesDate)
                    .orElse(DailySalesRecord.builder()
                            .salesDate(salesDate)
                            .totalAmount(BigDecimal.ZERO)
                            .orderCount(0)
                            .build());

            record.addSale(amount);
            dailySalesRecordRepository.save(record);

            log.debug("Sales recorded: date={}, amount={}, eventType={}", salesDate, amount, event.eventType());
        } catch (Exception e) {
            log.error("Failed to process order event for sales analytics: {}", message, e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OrderEventDto(
            String eventType,
            String orderNumber,
            Long userId,
            BigDecimal totalAmount,
            java.time.LocalDateTime occurredAt
    ) {}
}
