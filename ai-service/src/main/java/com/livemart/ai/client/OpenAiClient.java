package com.livemart.ai.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.dto.OpenAiRequest;
import com.livemart.ai.dto.OpenAiResponse;
import com.livemart.ai.exception.AiServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * OpenAI Chat Completions API 클라이언트 (WebFlux 전용)
 *
 * build.gradle에서 spring-boot-starter-web 제거 → RestClient 사용 불가
 * → WebClient 단일 클라이언트로 통일:
 * - 동기 호출: Mono.block() 사용 (추천, 설명 생성) — 30s 타임아웃
 * - 스트리밍: Flux (챗봇 SSE)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiClient {

    private static final String CHAT_PATH = "/chat/completions";
    private static final Duration SYNC_TIMEOUT = Duration.ofSeconds(30);

    private final WebClient openAiWebClient;
    private final ObjectMapper objectMapper;

    /**
     * 동기 Chat Completions 호출 (추천, 설명 생성)
     * WebClient.block()으로 동기화 — WebFlux 컨텍스트에서 사용 시 별도 Scheduler 필요
     */
    public OpenAiResponse chat(OpenAiRequest request) {
        long start = System.currentTimeMillis();
        try {
            OpenAiResponse response = openAiWebClient.post()
                    .uri(CHAT_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(OpenAiResponse.class)
                    .timeout(SYNC_TIMEOUT)
                    .block();

            log.info("OpenAI response: model={}, tokens={}, latency={}ms",
                    response != null ? response.model() : "null",
                    response != null && response.usage() != null ? response.usage().totalTokens() : 0,
                    System.currentTimeMillis() - start);

            return response;

        } catch (WebClientResponseException.TooManyRequests e) {
            log.warn("OpenAI rate limit exceeded");
            throw new AiServiceException("AI 서비스 요청 한도 초과. 잠시 후 다시 시도해주세요.", e);
        } catch (WebClientResponseException.Unauthorized e) {
            log.error("OpenAI API key invalid");
            throw new AiServiceException("AI 서비스 인증 오류", e);
        } catch (Exception e) {
            log.error("OpenAI call failed: {}", e.getMessage());
            throw new AiServiceException("AI 서비스 일시적 오류", e);
        }
    }

    /**
     * 비동기 스트리밍 Chat Completions (챗봇 SSE)
     * stream=true 모드, delta 텍스트를 Flux<String>으로 방출
     */
    public Flux<String> chatStream(OpenAiRequest request) {
        return openAiWebClient.post()
                .uri(CHAT_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(line -> line.startsWith("data: ") && !line.equals("data: [DONE]"))
                .map(line -> line.substring(6))  // "data: " 제거
                .mapNotNull(json -> {
                    try {
                        var resp = objectMapper.readValue(json, OpenAiResponse.class);
                        var choices = resp.choices();
                        if (choices == null || choices.isEmpty()) return null;
                        var delta = choices.get(0).delta();
                        return delta != null ? delta.content() : null;
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(content -> content != null && !content.isEmpty())
                .doOnError(e -> log.error("OpenAI stream error: {}", e.getMessage()))
                .onErrorResume(e -> Mono.empty()); // 스트리밍 오류 시 종료
    }
}
