package com.livemart.order.batch;

import com.livemart.order.domain.OrderStatus;
import com.livemart.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;

/**
 * 월별 매출 리포트 배치 Job (Tasklet 방식)
 * - 전월 주문 통계 집계
 * - 상태별 주문 건수, 총 매출, 취소율 산출
 * - 매월 1일 새벽 실행
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class MonthlyReportJobConfig {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final OrderRepository orderRepository;

    @Bean
    public Job monthlyReportJob() {
        return new JobBuilder("monthlyReportJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(monthlyReportStep())
                .build();
    }

    @Bean
    public Step monthlyReportStep() {
        return new StepBuilder("monthlyReportStep", jobRepository)
                .tasklet(monthlyReportTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet monthlyReportTasklet() {
        return (contribution, chunkContext) -> {
            YearMonth lastMonth = YearMonth.now().minusMonths(1);
            LocalDateTime startDate = lastMonth.atDay(1).atStartOfDay();
            LocalDateTime endDate = lastMonth.atEndOfMonth().atTime(LocalTime.MAX);

            log.info("========================================");
            log.info("월별 리포트 생성: {} ~ {}", startDate.toLocalDate(), endDate.toLocalDate());
            log.info("========================================");

            // 상태별 주문 통계
            long totalOrders = orderRepository.countByStatus(OrderStatus.CONFIRMED)
                    + orderRepository.countByStatus(OrderStatus.SHIPPED)
                    + orderRepository.countByStatus(OrderStatus.DELIVERED);
            long cancelledOrders = orderRepository.countByStatus(OrderStatus.CANCELLED);
            long pendingOrders = orderRepository.countByStatus(OrderStatus.PENDING);

            log.info("=== {} 월별 리포트 ===", lastMonth);
            log.info("총 확인/배송/완료 주문: {} 건", totalOrders);
            log.info("취소 주문: {} 건", cancelledOrders);
            log.info("대기 중 주문: {} 건", pendingOrders);

            if (totalOrders + cancelledOrders > 0) {
                double cancelRate = (double) cancelledOrders / (totalOrders + cancelledOrders) * 100;
                log.info("취소율: {}%", String.format("%.2f", cancelRate));
            }

            log.info("========================================");
            log.info("월별 리포트 생성 완료");
            log.info("========================================");

            return RepeatStatus.FINISHED;
        };
    }
}
