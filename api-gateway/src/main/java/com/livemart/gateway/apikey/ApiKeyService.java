package com.livemart.gateway.apikey;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * API Key 관리 서비스
 *
 * 기능:
 * 1. API Key 생성 (UUID 기반)
 * 2. API Key 검증 및 인증
 * 3. Rate Limiting (분당 요청 제한)
 * 4. 사용량 추적 및 통계
 * 5. API Key 만료 관리
 * 6. IP 화이트리스트
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ApiKeyService {

    private final RedisTemplate<String, Object> redisTemplate;

    // 메모리 캐시 (빠른 조회)
    private final Map<String, ApiKeyInfo> apiKeyCache = new ConcurrentHashMap<>();

    private static final String REDIS_PREFIX = "apikey:";
    private static final String USAGE_PREFIX = "usage:";
    private static final int DEFAULT_RATE_LIMIT = 1000; // 분당 1000 요청

    /**
     * API Key 생성
     */
    public ApiKeyInfo createApiKey(CreateApiKeyRequest request) {
        String apiKey = generateApiKey();
        String secretKey = generateSecretKey();

        ApiKeyInfo keyInfo = new ApiKeyInfo(
            apiKey,
            secretKey,
            request.name(),
            request.description(),
            request.userId(),
            request.rateLimit() > 0 ? request.rateLimit() : DEFAULT_RATE_LIMIT,
            request.allowedIps(),
            request.expiresAt(),
            ApiKeyStatus.ACTIVE,
            LocalDateTime.now(),
            null,
            0L,
            0L
        );

        // Redis에 저장 (영속성)
        saveToRedis(keyInfo);

        // 메모리 캐시에 저장 (빠른 조회)
        apiKeyCache.put(apiKey, keyInfo);

        log.info("API Key created: name={}, userId={}, rateLimit={}",
                 request.name(), request.userId(), keyInfo.rateLimit());

        return keyInfo;
    }

    /**
     * API Key 검증
     */
    public ValidationResult validateApiKey(String apiKey, String ipAddress) {
        // 1. API Key 존재 확인
        ApiKeyInfo keyInfo = getApiKeyInfo(apiKey);
        if (keyInfo == null) {
            return new ValidationResult(false, "Invalid API Key", null);
        }

        // 2. 상태 확인
        if (keyInfo.status() != ApiKeyStatus.ACTIVE) {
            return new ValidationResult(false, "API Key is " + keyInfo.status(), null);
        }

        // 3. 만료 확인
        if (keyInfo.expiresAt() != null && keyInfo.expiresAt().isBefore(LocalDateTime.now())) {
            updateStatus(apiKey, ApiKeyStatus.EXPIRED);
            return new ValidationResult(false, "API Key expired", null);
        }

        // 4. IP 화이트리스트 확인
        if (keyInfo.allowedIps() != null && !keyInfo.allowedIps().isEmpty()) {
            if (!keyInfo.allowedIps().contains(ipAddress)) {
                log.warn("IP not whitelisted: apiKey={}, ip={}", maskApiKey(apiKey), ipAddress);
                return new ValidationResult(false, "IP not allowed", null);
            }
        }

        // 5. Rate Limiting 확인
        if (!checkRateLimit(apiKey, keyInfo.rateLimit())) {
            return new ValidationResult(false, "Rate limit exceeded", null);
        }

        // 6. 사용량 증가
        incrementUsage(apiKey);

        return new ValidationResult(true, "Valid", keyInfo);
    }

    /**
     * Rate Limiting 체크 (Sliding Window)
     */
    private boolean checkRateLimit(String apiKey, int limit) {
        String key = USAGE_PREFIX + apiKey + ":minute:" + getCurrentMinute();

        Long currentCount = (Long) redisTemplate.opsForValue().get(key);
        if (currentCount == null) {
            currentCount = 0L;
        }

        if (currentCount >= limit) {
            log.warn("Rate limit exceeded: apiKey={}, current={}, limit={}",
                     maskApiKey(apiKey), currentCount, limit);
            return false;
        }

        // 카운트 증가 및 만료 시간 설정
        redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, 2, TimeUnit.MINUTES);

        return true;
    }

    /**
     * 사용량 증가
     */
    private void incrementUsage(String apiKey) {
        ApiKeyInfo current = apiKeyCache.get(apiKey);
        if (current != null) {
            ApiKeyInfo updated = new ApiKeyInfo(
                current.apiKey(),
                current.secretKey(),
                current.name(),
                current.description(),
                current.userId(),
                current.rateLimit(),
                current.allowedIps(),
                current.expiresAt(),
                current.status(),
                current.createdAt(),
                LocalDateTime.now(),
                current.totalRequests() + 1,
                current.totalErrors()
            );

            apiKeyCache.put(apiKey, updated);

            // Redis에 비동기 업데이트
            saveToRedis(updated);
        }
    }

    /**
     * 에러 카운트 증가
     */
    public void incrementErrors(String apiKey) {
        ApiKeyInfo current = apiKeyCache.get(apiKey);
        if (current != null) {
            ApiKeyInfo updated = new ApiKeyInfo(
                current.apiKey(),
                current.secretKey(),
                current.name(),
                current.description(),
                current.userId(),
                current.rateLimit(),
                current.allowedIps(),
                current.expiresAt(),
                current.status(),
                current.createdAt(),
                current.lastUsedAt(),
                current.totalRequests(),
                current.totalErrors() + 1
            );

            apiKeyCache.put(apiKey, updated);
            saveToRedis(updated);
        }
    }

    /**
     * API Key 상태 변경
     */
    public void updateStatus(String apiKey, ApiKeyStatus newStatus) {
        ApiKeyInfo current = apiKeyCache.get(apiKey);
        if (current != null) {
            ApiKeyInfo updated = new ApiKeyInfo(
                current.apiKey(),
                current.secretKey(),
                current.name(),
                current.description(),
                current.userId(),
                current.rateLimit(),
                current.allowedIps(),
                current.expiresAt(),
                newStatus,
                current.createdAt(),
                current.lastUsedAt(),
                current.totalRequests(),
                current.totalErrors()
            );

            apiKeyCache.put(apiKey, updated);
            saveToRedis(updated);

            log.info("API Key status updated: apiKey={}, status={}",
                     maskApiKey(apiKey), newStatus);
        }
    }

    /**
     * API Key 조회
     */
    public ApiKeyInfo getApiKeyInfo(String apiKey) {
        // 캐시 확인
        ApiKeyInfo cached = apiKeyCache.get(apiKey);
        if (cached != null) {
            return cached;
        }

        // Redis 조회
        ApiKeyInfo fromRedis = (ApiKeyInfo) redisTemplate.opsForValue().get(REDIS_PREFIX + apiKey);
        if (fromRedis != null) {
            apiKeyCache.put(apiKey, fromRedis);
        }

        return fromRedis;
    }

    /**
     * 사용자별 API Key 목록
     */
    public List<ApiKeyInfo> getApiKeysByUserId(Long userId) {
        return apiKeyCache.values().stream()
            .filter(key -> key.userId().equals(userId))
            .toList();
    }

    /**
     * API Key 사용 통계
     */
    public ApiKeyStats getStats(String apiKey) {
        ApiKeyInfo keyInfo = getApiKeyInfo(apiKey);
        if (keyInfo == null) {
            return null;
        }

        // 최근 1시간 사용량
        long lastHourRequests = getRequestsInLastHour(apiKey);

        // 오늘 사용량
        long todayRequests = getRequestsToday(apiKey);

        // 에러율 계산
        double errorRate = keyInfo.totalRequests() > 0
            ? (double) keyInfo.totalErrors() / keyInfo.totalRequests() * 100
            : 0.0;

        return new ApiKeyStats(
            apiKey,
            keyInfo.name(),
            keyInfo.totalRequests(),
            keyInfo.totalErrors(),
            errorRate,
            lastHourRequests,
            todayRequests,
            keyInfo.lastUsedAt()
        );
    }

    /**
     * API Key 삭제 (비활성화)
     */
    public void revokeApiKey(String apiKey) {
        updateStatus(apiKey, ApiKeyStatus.REVOKED);
        log.info("API Key revoked: {}", maskApiKey(apiKey));
    }

    // Helper Methods

    private String generateApiKey() {
        return "lm_" + UUID.randomUUID().toString().replace("-", "");
    }

    private String generateSecretKey() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    private void saveToRedis(ApiKeyInfo keyInfo) {
        redisTemplate.opsForValue().set(
            REDIS_PREFIX + keyInfo.apiKey(),
            keyInfo,
            365,
            TimeUnit.DAYS
        );
    }

    private String getCurrentMinute() {
        return String.valueOf(System.currentTimeMillis() / 60000);
    }

    private String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() < 10) return "***";
        return apiKey.substring(0, 7) + "..." + apiKey.substring(apiKey.length() - 4);
    }

    private long getRequestsInLastHour(String apiKey) {
        long count = 0;
        long currentMinute = System.currentTimeMillis() / 60000;

        for (int i = 0; i < 60; i++) {
            String key = USAGE_PREFIX + apiKey + ":minute:" + (currentMinute - i);
            Long minuteCount = (Long) redisTemplate.opsForValue().get(key);
            if (minuteCount != null) {
                count += minuteCount;
            }
        }

        return count;
    }

    private long getRequestsToday(String apiKey) {
        // 간단한 구현 (실제로는 날짜별 집계 필요)
        return getRequestsInLastHour(apiKey) * 24;
    }

    // Enums & Records

    public enum ApiKeyStatus {
        ACTIVE, SUSPENDED, EXPIRED, REVOKED
    }

    public record ApiKeyInfo(
        String apiKey,
        String secretKey,
        String name,
        String description,
        Long userId,
        int rateLimit,
        List<String> allowedIps,
        LocalDateTime expiresAt,
        ApiKeyStatus status,
        LocalDateTime createdAt,
        LocalDateTime lastUsedAt,
        long totalRequests,
        long totalErrors
    ) {}

    public record CreateApiKeyRequest(
        String name,
        String description,
        Long userId,
        int rateLimit,
        List<String> allowedIps,
        LocalDateTime expiresAt
    ) {}

    public record ValidationResult(
        boolean valid,
        String message,
        ApiKeyInfo keyInfo
    ) {}

    public record ApiKeyStats(
        String apiKey,
        String name,
        long totalRequests,
        long totalErrors,
        double errorRate,
        long lastHourRequests,
        long todayRequests,
        LocalDateTime lastUsedAt
    ) {}
}
