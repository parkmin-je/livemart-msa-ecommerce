package com.livemart.user.controller;

import com.livemart.user.audit.SecurityAuditService;
import com.livemart.user.audit.SecurityAuditService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 보안 감사 로그 API
 */
@RestController
@RequestMapping("/api/v1/security/audit")
@RequiredArgsConstructor
public class SecurityAuditController {

    private final SecurityAuditService auditService;

    /**
     * 사용자별 감사 로그 조회
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<List<AuditLog>> getUserAuditLogs(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        List<AuditLog> logs = auditService.getUserAuditLogs(userId, from, to);
        return ResponseEntity.ok(logs);
    }

    /**
     * 실패 이벤트 조회
     */
    @GetMapping("/failures")
    public ResponseEntity<List<AuditLog>> getFailedEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "100") int limit) {

        List<AuditLog> logs = auditService.getFailedEvents(from, to, limit);
        return ResponseEntity.ok(logs);
    }

    /**
     * 이벤트 타입별 통계
     */
    @GetMapping("/stats/event-types")
    public ResponseEntity<Map<AuditEventType, Long>> getEventTypeStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        Map<AuditEventType, Long> stats = auditService.getEventTypeStats(from, to);
        return ResponseEntity.ok(stats);
    }

    /**
     * IP별 접근 통계
     */
    @GetMapping("/stats/ip-access")
    public ResponseEntity<Map<String, Long>> getIpAccessStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        Map<String, Long> stats = auditService.getIpAccessStats(from, to);
        return ResponseEntity.ok(stats);
    }

    /**
     * 감사 리포트 생성
     */
    @GetMapping("/report")
    public ResponseEntity<AuditReport> generateReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        AuditReport report = auditService.generateReport(from, to);
        return ResponseEntity.ok(report);
    }

    /**
     * IP 차단
     */
    @PostMapping("/block-ip")
    public ResponseEntity<String> blockIp(
            @RequestParam String ipAddress,
            @RequestParam String reason) {

        auditService.blockIpAddress(ipAddress, reason);
        return ResponseEntity.ok("IP blocked successfully");
    }

    /**
     * IP 차단 해제
     */
    @DeleteMapping("/block-ip/{ipAddress}")
    public ResponseEntity<String> unblockIp(@PathVariable String ipAddress) {
        auditService.unblockIpAddress(ipAddress);
        return ResponseEntity.ok("IP unblocked successfully");
    }

    /**
     * IP 차단 여부 확인
     */
    @GetMapping("/block-ip/{ipAddress}")
    public ResponseEntity<BlockStatus> checkIpBlocked(@PathVariable String ipAddress) {
        boolean blocked = auditService.isIpBlocked(ipAddress);
        return ResponseEntity.ok(new BlockStatus(ipAddress, blocked));
    }

    // DTOs

    public record BlockStatus(
        String ipAddress,
        boolean blocked
    ) {}
}
