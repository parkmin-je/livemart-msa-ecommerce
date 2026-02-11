package com.livemart.analytics.controller;

import com.livemart.analytics.stream.RealTimeDashboardService;
import com.livemart.analytics.stream.RealTimeDashboardService.DashboardAlert;
import com.livemart.analytics.stream.RealTimeDashboardService.DashboardMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import javax.annotation.PostConstruct;

/**
 * 실시간 대시보드 API
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class RealTimeDashboardController {

    private final RealTimeDashboardService dashboardService;

    @PostConstruct
    public void init() {
        // 서비스 시작 시 메트릭 스트리밍 시작
        dashboardService.startMetricsStreaming();
    }

    /**
     * 실시간 메트릭 구독 (SSE)
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMetrics() {
        return dashboardService.subscribe();
    }

    /**
     * 현재 메트릭 조회 (REST)
     */
    @GetMapping("/metrics")
    public ResponseEntity<DashboardMetrics> getCurrentMetrics() {
        DashboardMetrics metrics = dashboardService.getCurrentMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * 알림 발송 (테스트용)
     */
    @PostMapping("/alert")
    public ResponseEntity<String> sendAlert(@RequestBody AlertRequest request) {
        DashboardAlert alert = new DashboardAlert(
            request.type(),
            request.message(),
            java.time.LocalDateTime.now()
        );

        dashboardService.broadcastAlert(alert);

        return ResponseEntity.ok("Alert sent successfully");
    }

    // DTOs

    public record AlertRequest(
        String type,
        String message
    ) {}
}
