package com.livemart.order.batch;

import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 배치 Job 실행 리스너 - 시작/종료 로깅 및 모니터링
 */
@Slf4j
public class SettlementJobListener implements JobExecutionListener {

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info("========================================");
        log.info("정산 배치 Job 시작");
        log.info("Job Name: {}", jobExecution.getJobInstance().getJobName());
        log.info("시작 시간: {}", LocalDateTime.now());
        log.info("========================================");
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        Duration duration = Duration.between(
                jobExecution.getStartTime(),
                jobExecution.getEndTime() != null ? jobExecution.getEndTime() : LocalDateTime.now()
        );

        log.info("========================================");
        log.info("정산 배치 Job 종료");
        log.info("상태: {}", jobExecution.getStatus());
        log.info("소요 시간: {}초", duration.getSeconds());

        if (jobExecution.getStatus() == BatchStatus.COMPLETED) {
            log.info("정산 배치가 성공적으로 완료되었습니다.");
        } else if (jobExecution.getStatus() == BatchStatus.FAILED) {
            log.error("정산 배치 실패!");
            jobExecution.getAllFailureExceptions().forEach(
                    ex -> log.error("실패 원인: {}", ex.getMessage())
            );
        }
        log.info("========================================");
    }
}
