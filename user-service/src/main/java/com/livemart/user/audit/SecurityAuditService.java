package com.livemart.user.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 보안 감사 로그 서비스
 *
 * 기능:
 * 1. 인증/인가 이벤트 로깅
 * 2. 의심스러운 활동 감지
 * 3. 로그인 실패 추적
 * 4. IP 기반 차단
 * 5. 감사 리포트 생성
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SecurityAuditService {

    private final RedisTemplate<String, Object> redisTemplate;

    // 메모리 캐시 (빠른 조회)
    private final Map<String, List<AuditLog>> auditCache = new ConcurrentHashMap<>();

    private static final String AUDIT_PREFIX = "audit:";
    private static final String FAILED_LOGIN_PREFIX = "failed:";
    private static final String BLOCKED_IP_PREFIX = "blocked:";

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration BLOCK_DURATION = Duration.ofHours(1);
    private static final Duration FAILED_ATTEMPT_WINDOW = Duration.ofMinutes(15);

    /**
     * 감사 로그 기록
     */
    public void log(AuditLog auditLog) {
        // Redis에 저장 (영속성)
        String key = AUDIT_PREFIX + auditLog.userId() + ":" + System.currentTimeMillis();
        redisTemplate.opsForValue().set(key, auditLog, 30, TimeUnit.DAYS);

        // 메모리 캐시에 추가
        auditCache.computeIfAbsent(String.valueOf(auditLog.userId()), k -> new ArrayList<>())
            .add(auditLog);

        log.info("Security audit logged: userId={}, event={}, action={}, result={}",
                 auditLog.userId(), auditLog.eventType(), auditLog.action(), auditLog.result());

        // 의심스러운 활동 감지
        if (auditLog.result() == AuditResult.FAILURE) {
            checkSuspiciousActivity(auditLog);
        }
    }

    /**
     * 로그인 성공 기록
     */
    public void logLoginSuccess(Long userId, String ipAddress, String userAgent) {
        AuditLog auditLog = new AuditLog(
            UUID.randomUUID().toString(),
            userId,
            AuditEventType.AUTHENTICATION,
            "LOGIN",
            AuditResult.SUCCESS,
            ipAddress,
            userAgent,
            null,
            LocalDateTime.now(),
            Map.of("method", "password")
        );

        log(auditLog);

        // 로그인 실패 카운터 초기화
        clearFailedLoginAttempts(ipAddress);
    }

    /**
     * 로그인 실패 기록
     */
    public void logLoginFailure(String username, String ipAddress, String userAgent, String reason) {
        AuditLog auditLog = new AuditLog(
            UUID.randomUUID().toString(),
            null,
            AuditEventType.AUTHENTICATION,
            "LOGIN",
            AuditResult.FAILURE,
            ipAddress,
            userAgent,
            reason,
            LocalDateTime.now(),
            Map.of("username", username)
        );

        log(auditLog);

        // 실패 횟수 증가
        incrementFailedLoginAttempts(ipAddress);
    }

    /**
     * 권한 거부 기록
     */
    public void logAccessDenied(Long userId, String resource, String ipAddress, String reason) {
        AuditLog auditLog = new AuditLog(
            UUID.randomUUID().toString(),
            userId,
            AuditEventType.AUTHORIZATION,
            "ACCESS_DENIED",
            AuditResult.FAILURE,
            ipAddress,
            null,
            reason,
            LocalDateTime.now(),
            Map.of("resource", resource)
        );

        log(auditLog);
    }

    /**
     * 데이터 접근 기록
     */
    public void logDataAccess(Long userId, String dataType, String action, String ipAddress) {
        AuditLog auditLog = new AuditLog(
            UUID.randomUUID().toString(),
            userId,
            AuditEventType.DATA_ACCESS,
            action,
            AuditResult.SUCCESS,
            ipAddress,
            null,
            null,
            LocalDateTime.now(),
            Map.of("dataType", dataType)
        );

        log(auditLog);
    }

    /**
     * 설정 변경 기록
     */
    public void logConfigChange(Long userId, String configKey, String oldValue,
                                 String newValue, String ipAddress) {
        AuditLog auditLog = new AuditLog(
            UUID.randomUUID().toString(),
            userId,
            AuditEventType.CONFIGURATION_CHANGE,
            "CONFIG_UPDATE",
            AuditResult.SUCCESS,
            ipAddress,
            null,
            null,
            LocalDateTime.now(),
            Map.of(
                "configKey", configKey,
                "oldValue", oldValue,
                "newValue", newValue
            )
        );

        log(auditLog);
    }

    /**
     * 의심스러운 활동 감지
     */
    private void checkSuspiciousActivity(AuditLog auditLog) {
        // 1. 로그인 실패 횟수 체크
        if (auditLog.eventType() == AuditEventType.AUTHENTICATION &&
            "LOGIN".equals(auditLog.action())) {

            String ipAddress = auditLog.ipAddress();
            long failedAttempts = getFailedLoginAttempts(ipAddress);

            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                blockIpAddress(ipAddress, "Too many failed login attempts");
                log.warn("IP blocked due to failed login attempts: ip={}, attempts={}",
                         ipAddress, failedAttempts);
            }
        }

        // 2. 비정상적인 접근 패턴
        // TODO: 머신러닝 기반 이상 탐지
    }

    /**
     * 로그인 실패 횟수 증가
     */
    private void incrementFailedLoginAttempts(String ipAddress) {
        String key = FAILED_LOGIN_PREFIX + ipAddress;
        Long attempts = redisTemplate.opsForValue().increment(key);

        // 첫 실패 시 TTL 설정
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(key, FAILED_ATTEMPT_WINDOW.getSeconds(), TimeUnit.SECONDS);
        }
    }

    /**
     * 로그인 실패 횟수 조회
     */
    private long getFailedLoginAttempts(String ipAddress) {
        String key = FAILED_LOGIN_PREFIX + ipAddress;
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? ((Number) value).longValue() : 0;
    }

    /**
     * 로그인 실패 카운터 초기화
     */
    private void clearFailedLoginAttempts(String ipAddress) {
        String key = FAILED_LOGIN_PREFIX + ipAddress;
        redisTemplate.delete(key);
    }

    /**
     * IP 주소 차단
     */
    public void blockIpAddress(String ipAddress, String reason) {
        String key = BLOCKED_IP_PREFIX + ipAddress;
        BlockedIp blockedIp = new BlockedIp(
            ipAddress,
            reason,
            LocalDateTime.now(),
            LocalDateTime.now().plusHours(1)
        );

        redisTemplate.opsForValue().set(key, blockedIp, BLOCK_DURATION.getSeconds(), TimeUnit.SECONDS);

        log.warn("IP address blocked: ip={}, reason={}", ipAddress, reason);
    }

    /**
     * IP 차단 여부 확인
     */
    public boolean isIpBlocked(String ipAddress) {
        String key = BLOCKED_IP_PREFIX + ipAddress;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * IP 차단 해제
     */
    public void unblockIpAddress(String ipAddress) {
        String key = BLOCKED_IP_PREFIX + ipAddress;
        redisTemplate.delete(key);

        log.info("IP address unblocked: ip={}", ipAddress);
    }

    /**
     * 사용자별 감사 로그 조회
     */
    public List<AuditLog> getUserAuditLogs(Long userId, LocalDateTime from, LocalDateTime to) {
        List<AuditLog> logs = auditCache.getOrDefault(String.valueOf(userId), new ArrayList<>());

        return logs.stream()
            .filter(log -> !log.timestamp().isBefore(from) && !log.timestamp().isAfter(to))
            .sorted(Comparator.comparing(AuditLog::timestamp).reversed())
            .toList();
    }

    /**
     * 이벤트 타입별 통계
     */
    public Map<AuditEventType, Long> getEventTypeStats(LocalDateTime from, LocalDateTime to) {
        return auditCache.values().stream()
            .flatMap(List::stream)
            .filter(log -> !log.timestamp().isBefore(from) && !log.timestamp().isAfter(to))
            .collect(Collectors.groupingBy(AuditLog::eventType, Collectors.counting()));
    }

    /**
     * 실패 이벤트 조회
     */
    public List<AuditLog> getFailedEvents(LocalDateTime from, LocalDateTime to, int limit) {
        return auditCache.values().stream()
            .flatMap(List::stream)
            .filter(log -> log.result() == AuditResult.FAILURE)
            .filter(log -> !log.timestamp().isBefore(from) && !log.timestamp().isAfter(to))
            .sorted(Comparator.comparing(AuditLog::timestamp).reversed())
            .limit(limit)
            .toList();
    }

    /**
     * IP별 접근 통계
     */
    public Map<String, Long> getIpAccessStats(LocalDateTime from, LocalDateTime to) {
        return auditCache.values().stream()
            .flatMap(List::stream)
            .filter(log -> !log.timestamp().isBefore(from) && !log.timestamp().isAfter(to))
            .collect(Collectors.groupingBy(AuditLog::ipAddress, Collectors.counting()));
    }

    /**
     * 감사 리포트 생성
     */
    public AuditReport generateReport(LocalDateTime from, LocalDateTime to) {
        List<AuditLog> allLogs = auditCache.values().stream()
            .flatMap(List::stream)
            .filter(log -> !log.timestamp().isBefore(from) && !log.timestamp().isAfter(to))
            .toList();

        long totalEvents = allLogs.size();
        long successEvents = allLogs.stream()
            .filter(log -> log.result() == AuditResult.SUCCESS).count();
        long failedEvents = allLogs.stream()
            .filter(log -> log.result() == AuditResult.FAILURE).count();

        Map<AuditEventType, Long> eventTypeStats = allLogs.stream()
            .collect(Collectors.groupingBy(AuditLog::eventType, Collectors.counting()));

        Set<String> uniqueIps = allLogs.stream()
            .map(AuditLog::ipAddress)
            .collect(Collectors.toSet());

        Set<Long> uniqueUsers = allLogs.stream()
            .map(AuditLog::userId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        return new AuditReport(
            from,
            to,
            totalEvents,
            successEvents,
            failedEvents,
            eventTypeStats,
            uniqueIps.size(),
            uniqueUsers.size()
        );
    }

    // Enums & Records

    public enum AuditEventType {
        AUTHENTICATION,        // 인증
        AUTHORIZATION,         // 인가
        DATA_ACCESS,          // 데이터 접근
        DATA_MODIFICATION,    // 데이터 수정
        CONFIGURATION_CHANGE, // 설정 변경
        SECURITY_EVENT        // 보안 이벤트
    }

    public enum AuditResult {
        SUCCESS, FAILURE
    }

    public record AuditLog(
        String id,
        Long userId,
        AuditEventType eventType,
        String action,
        AuditResult result,
        String ipAddress,
        String userAgent,
        String failureReason,
        LocalDateTime timestamp,
        Map<String, String> metadata
    ) {}

    public record BlockedIp(
        String ipAddress,
        String reason,
        LocalDateTime blockedAt,
        LocalDateTime expiresAt
    ) {}

    public record AuditReport(
        LocalDateTime from,
        LocalDateTime to,
        long totalEvents,
        long successEvents,
        long failedEvents,
        Map<AuditEventType, Long> eventTypeStats,
        int uniqueIps,
        int uniqueUsers
    ) {}

    private static class Duration {
        public static Duration ofHours(int hours) {
            return new Duration(hours * 3600);
        }

        public static Duration ofMinutes(int minutes) {
            return new Duration(minutes * 60);
        }

        private final long seconds;

        private Duration(long seconds) {
            this.seconds = seconds;
        }

        public long getSeconds() {
            return seconds;
        }
    }
}
