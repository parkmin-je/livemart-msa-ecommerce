package com.livemart.order.batch;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 배치 수동 실행 컨트롤러
 * - 관리자가 필요 시 수동으로 배치를 실행할 수 있는 REST API
 */
@Tag(name = "Batch API", description = "배치 수동 실행 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/batch")
@RequiredArgsConstructor
public class BatchController {

    private final JobLauncher jobLauncher;
    private final Job dailySettlementJob;
    private final Job monthlyReportJob;

    @Operation(summary = "일일 정산 배치 수동 실행")
    @PostMapping("/daily-settlement")
    public ResponseEntity<Map<String, Object>> runDailySettlement() {
        try {
            JobParameters params = new JobParametersBuilder()
                    .addString("executionDate", LocalDateTime.now().toString())
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();

            JobExecution execution = jobLauncher.run(dailySettlementJob, params);

            return ResponseEntity.ok(Map.of(
                    "jobName", "dailySettlementJob",
                    "status", execution.getStatus().toString(),
                    "startTime", execution.getStartTime() != null ? execution.getStartTime().toString() : "N/A",
                    "executionId", execution.getId()
            ));
        } catch (Exception e) {
            log.error("일일 정산 배치 수동 실행 실패: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", e.getMessage(),
                    "jobName", "dailySettlementJob"
            ));
        }
    }

    @Operation(summary = "월별 리포트 배치 수동 실행")
    @PostMapping("/monthly-report")
    public ResponseEntity<Map<String, Object>> runMonthlyReport() {
        try {
            JobParameters params = new JobParametersBuilder()
                    .addString("executionDate", LocalDateTime.now().toString())
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();

            JobExecution execution = jobLauncher.run(monthlyReportJob, params);

            return ResponseEntity.ok(Map.of(
                    "jobName", "monthlyReportJob",
                    "status", execution.getStatus().toString(),
                    "startTime", execution.getStartTime() != null ? execution.getStartTime().toString() : "N/A",
                    "executionId", execution.getId()
            ));
        } catch (Exception e) {
            log.error("월별 리포트 배치 수동 실행 실패: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", e.getMessage(),
                    "jobName", "monthlyReportJob"
            ));
        }
    }
}
