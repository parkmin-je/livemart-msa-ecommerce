package com.livemart.gateway.controller;

import com.livemart.gateway.apikey.ApiKeyService;
import com.livemart.gateway.apikey.ApiKeyService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API Key 관리 API
 */
@RestController
@RequestMapping("/api/v1/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    /**
     * API Key 생성
     */
    @PostMapping
    public ResponseEntity<ApiKeyInfo> createApiKey(@RequestBody CreateApiKeyRequest request) {
        ApiKeyInfo apiKey = apiKeyService.createApiKey(request);
        return ResponseEntity.ok(apiKey);
    }

    /**
     * 사용자별 API Key 목록
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ApiKeyInfo>> getUserApiKeys(@PathVariable Long userId) {
        List<ApiKeyInfo> apiKeys = apiKeyService.getApiKeysByUserId(userId);
        return ResponseEntity.ok(apiKeys);
    }

    /**
     * API Key 정보 조회
     */
    @GetMapping("/{apiKey}")
    public ResponseEntity<ApiKeyInfo> getApiKey(@PathVariable String apiKey) {
        ApiKeyInfo keyInfo = apiKeyService.getApiKeyInfo(apiKey);

        if (keyInfo == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(keyInfo);
    }

    /**
     * API Key 통계
     */
    @GetMapping("/{apiKey}/stats")
    public ResponseEntity<ApiKeyStats> getApiKeyStats(@PathVariable String apiKey) {
        ApiKeyStats stats = apiKeyService.getStats(apiKey);

        if (stats == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(stats);
    }

    /**
     * API Key 상태 변경
     */
    @PatchMapping("/{apiKey}/status")
    public ResponseEntity<String> updateStatus(
            @PathVariable String apiKey,
            @RequestParam ApiKeyStatus status) {

        apiKeyService.updateStatus(apiKey, status);
        return ResponseEntity.ok("Status updated successfully");
    }

    /**
     * API Key 삭제 (비활성화)
     */
    @DeleteMapping("/{apiKey}")
    public ResponseEntity<String> revokeApiKey(@PathVariable String apiKey) {
        apiKeyService.revokeApiKey(apiKey);
        return ResponseEntity.ok("API Key revoked successfully");
    }

    /**
     * API Key 검증 (테스트용)
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidationResult> validateApiKey(
            @RequestParam String apiKey,
            @RequestParam(required = false, defaultValue = "0.0.0.0") String ipAddress) {

        ValidationResult result = apiKeyService.validateApiKey(apiKey, ipAddress);
        return ResponseEntity.ok(result);
    }
}
