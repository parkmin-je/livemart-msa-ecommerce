package com.livemart.order.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 배치 스케줄러 - 정산 및 리포트 배치 자동 실행
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BatchScheduler {

    private final JobLauncher jobLauncher;
    private final Job dailySettlementJob;
    private final Job monthlyReportJob;

    /**
     * 일일 정산 배치 - 매일 새벽 1시 실행
     */
    @Scheduled(cron = "0 0 1 * * *")
    public void runDailySettlement() {
        log.info("일일 정산 배치 스케줄 실행: {}", LocalDateTime.now());
        try {
            JobParameters params = new JobParametersBuilder()
                    .addString("executionDate", LocalDateTime.now().toString())
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();

            jobLauncher.run(dailySettlementJob, params);
        } catch (Exception e) {
            log.error("일일 정산 배치 실행 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 월별 리포트 배치 - 매월 1일 새벽 2시 실행
     */
    @Scheduled(cron = "0 0 2 1 * *")
    public void runMonthlyReport() {
        log.info("월별 리포트 배치 스케줄 실행: {}", LocalDateTime.now());
        try {
            JobParameters params = new JobParametersBuilder()
                    .addString("executionDate", LocalDateTime.now().toString())
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();

            jobLauncher.run(monthlyReportJob, params);
        } catch (Exception e) {
            log.error("월별 리포트 배치 실행 실패: {}", e.getMessage(), e);
        }
    }
}
