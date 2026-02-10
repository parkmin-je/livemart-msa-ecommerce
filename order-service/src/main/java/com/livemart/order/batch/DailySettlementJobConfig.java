package com.livemart.order.batch;

import com.livemart.order.domain.Order;
import com.livemart.order.domain.OrderStatus;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.JpaPagingItemReader;
import org.springframework.batch.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 일일 매출 정산 배치 Job
 * - 전일 확인(CONFIRMED) 이상 상태의 주문을 집계
 * - 일별 총 매출, 주문 건수, 평균 주문 금액 산출
 * - 매일 자정 실행 (cron 스케줄)
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class DailySettlementJobConfig {

    private final EntityManagerFactory entityManagerFactory;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;

    @Bean
    public Job dailySettlementJob() {
        return new JobBuilder("dailySettlementJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(dailySettlementStep())
                .listener(new SettlementJobListener())
                .build();
    }

    @Bean
    public Step dailySettlementStep() {
        return new StepBuilder("dailySettlementStep", jobRepository)
                .<Order, DailySettlementDto>chunk(100, transactionManager)
                .reader(confirmedOrderReader())
                .processor(settlementProcessor())
                .writer(settlementWriter())
                .build();
    }

    @Bean
    public JpaPagingItemReader<Order> confirmedOrderReader() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDateTime startOfDay = yesterday.atStartOfDay();
        LocalDateTime endOfDay = yesterday.atTime(LocalTime.MAX);

        Map<String, Object> params = new HashMap<>();
        params.put("startDate", startOfDay);
        params.put("endDate", endOfDay);
        params.put("confirmedStatus", OrderStatus.CONFIRMED);
        params.put("shippedStatus", OrderStatus.SHIPPED);
        params.put("deliveredStatus", OrderStatus.DELIVERED);

        return new JpaPagingItemReaderBuilder<Order>()
                .name("confirmedOrderReader")
                .entityManagerFactory(entityManagerFactory)
                .queryString(
                        "SELECT o FROM Order o WHERE o.createdAt BETWEEN :startDate AND :endDate " +
                        "AND o.status IN (:confirmedStatus, :shippedStatus, :deliveredStatus) " +
                        "ORDER BY o.id ASC")
                .parameterValues(params)
                .pageSize(100)
                .build();
    }

    @Bean
    public ItemProcessor<Order, DailySettlementDto> settlementProcessor() {
        return order -> {
            log.debug("정산 처리 중: orderNumber={}, amount={}", order.getOrderNumber(), order.getTotalAmount());
            return DailySettlementDto.builder()
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .userId(order.getUserId())
                    .totalAmount(order.getTotalAmount())
                    .status(order.getStatus().name())
                    .createdAt(order.getCreatedAt())
                    .build();
        };
    }

    @Bean
    public ItemWriter<DailySettlementDto> settlementWriter() {
        AtomicInteger orderCount = new AtomicInteger(0);
        AtomicReference<BigDecimal> totalRevenue = new AtomicReference<>(BigDecimal.ZERO);

        return items -> {
            for (DailySettlementDto dto : items) {
                orderCount.incrementAndGet();
                totalRevenue.updateAndGet(current -> current.add(dto.getTotalAmount()));
            }

            log.info("=== 일일 정산 중간 집계 ===");
            log.info("처리 건수: {} 건", orderCount.get());
            log.info("누적 매출: {} 원", totalRevenue.get());

            if (orderCount.get() > 0) {
                BigDecimal avgAmount = totalRevenue.get()
                        .divide(BigDecimal.valueOf(orderCount.get()), 2, java.math.RoundingMode.HALF_UP);
                log.info("평균 주문금액: {} 원", avgAmount);
            }
        };
    }
}
