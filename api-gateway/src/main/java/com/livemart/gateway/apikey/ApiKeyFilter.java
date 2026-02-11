package com.livemart.gateway.apikey;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * API Key 인증 필터
 *
 * Spring Cloud Gateway의 GlobalFilter로 구현
 * 모든 요청에 대해 API Key 검증 수행
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyFilter implements GlobalFilter, Ordered {

    private final ApiKeyService apiKeyService;

    private static final String API_KEY_HEADER = "X-API-Key";
    private static final List<String> EXCLUDED_PATHS = List.of(
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/health",
        "/actuator"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        // 제외 경로 체크
        if (isExcludedPath(path)) {
            return chain.filter(exchange);
        }

        // API Key 헤더 확인
        String apiKey = request.getHeaders().getFirst(API_KEY_HEADER);

        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("Missing API Key: path={}", path);
            return unauthorized(exchange, "API Key is required");
        }

        // IP 주소 추출
        String ipAddress = getClientIpAddress(request);

        // API Key 검증
        ApiKeyService.ValidationResult result = apiKeyService.validateApiKey(apiKey, ipAddress);

        if (!result.valid()) {
            log.warn("Invalid API Key: apiKey={}, reason={}, ip={}",
                     maskApiKey(apiKey), result.message(), ipAddress);
            return unauthorized(exchange, result.message());
        }

        // 검증 성공: 사용자 정보를 헤더에 추가
        ServerHttpRequest mutatedRequest = request.mutate()
            .header("X-User-Id", String.valueOf(result.keyInfo().userId()))
            .header("X-API-Key-Name", result.keyInfo().name())
            .build();

        log.debug("API Key validated: apiKey={}, userId={}, path={}",
                  maskApiKey(apiKey), result.keyInfo().userId(), path);

        return chain.filter(exchange.mutate().request(mutatedRequest).build())
            .onErrorResume(throwable -> {
                // 에러 발생 시 카운트 증가
                apiKeyService.incrementErrors(apiKey);
                return Mono.error(throwable);
            });
    }

    private boolean isExcludedPath(String path) {
        return EXCLUDED_PATHS.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");

        String body = String.format("{\"error\":\"Unauthorized\",\"message\":\"%s\"}", message);

        return response.writeWith(
            Mono.just(response.bufferFactory().wrap(body.getBytes()))
        );
    }

    private String getClientIpAddress(ServerHttpRequest request) {
        // X-Forwarded-For 헤더 확인 (프록시/로드밸런서 뒤)
        String xForwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        // X-Real-IP 헤더 확인
        String xRealIp = request.getHeaders().getFirst("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        // 직접 연결
        return request.getRemoteAddress() != null
            ? request.getRemoteAddress().getAddress().getHostAddress()
            : "unknown";
    }

    private String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() < 10) return "***";
        return apiKey.substring(0, 7) + "..." + apiKey.substring(apiKey.length() - 4);
    }

    @Override
    public int getOrder() {
        return -100; // 높은 우선순위 (인증은 먼저 실행)
    }
}
