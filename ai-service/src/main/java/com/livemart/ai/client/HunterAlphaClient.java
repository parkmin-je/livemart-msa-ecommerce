package com.livemart.ai.client;

import com.livemart.ai.dto.OpenAiRequest;
import com.livemart.ai.dto.OpenAiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Hunter Alpha (Xiaomi MiMo-V2-Pro) client via OpenRouter API
 *
 * 아젠틱 태스크(셀러 에이전트, 이탈 예측, 수요 예측)에 사용.
 * OPENROUTER_API_KEY 미설정 시 isEnabled() = false → GPT-4o-mini fallback.
 */
@Slf4j
@Component
public class HunterAlphaClient {

    private static final Duration SYNC_TIMEOUT = Duration.ofSeconds(60);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public HunterAlphaClient(
            @Value("${hunter-alpha.api.key:}") String apiKey,
            @Value("${hunter-alpha.api.base-url:https://openrouter.ai/api/v1}") String baseUrl,
            ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.enabled = apiKey != null && !apiKey.isBlank();
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + (apiKey != null ? apiKey : ""))
                .defaultHeader("HTTP-Referer", "https://livemart.com")
                .defaultHeader("X-Title", "LiveMart AI")
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();

        if (this.enabled) {
            log.info("Hunter Alpha (MiMo-V2-Pro) client initialized — agentic tasks enabled");
        } else {
            log.warn("Hunter Alpha API key not set — falling back to GPT-4o-mini for all agentic tasks");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * 동기 Chat Completions 호출 (WebFlux block)
     */
    public OpenAiResponse chat(OpenAiRequest request) {
        if (!enabled) {
            log.debug("Hunter Alpha disabled — returning null for fallback");
            return null;
        }
        try {
            OpenAiResponse response = webClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(OpenAiResponse.class)
                    .timeout(SYNC_TIMEOUT)
                    .block();

            log.info("Hunter Alpha response: model={}, tokens={}",
                    response != null ? response.model() : "null",
                    response != null && response.usage() != null ? response.usage().totalTokens() : 0);
            return response;

        } catch (Exception e) {
            log.error("Hunter Alpha API error: {}", e.getMessage());
            return null;
        }
    }
}
