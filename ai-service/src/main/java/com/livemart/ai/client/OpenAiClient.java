package com.livemart.ai.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.dto.OpenAiRequest;
import com.livemart.ai.dto.OpenAiResponse;
import com.livemart.ai.exception.AiServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

/**
 * OpenAI Chat Completions API 클라이언트
 *
 * Spring AI SDK 대신 순수 RestClient/WebClient 직접 호출.
 * - 동기: RestClient (추천, 설명 생성)
 * - 비동기 스트리밍: WebClient + SSE (챗봇)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiClient {

    private static final String CHAT_PATH = "/chat/completions";

    private final RestClient openAiRestClient;
    private final WebClient openAiWebClient;
    private final ObjectMapper objectMapper;

    /**
     * 동기 Chat Completions 호출
     */
    public OpenAiResponse chat(OpenAiRequest request) {
        long start = System.currentTimeMillis();
        try {
            var response = openAiRestClient.post()
                    .uri(CHAT_PATH)
                    .body(request)
                    .retrieve()
                    .body(OpenAiResponse.class);

            log.info("OpenAI response: model={}, tokens={}, latency={}ms",
                    response != null ? response.model() : "null",
                    response != null && response.usage() != null ? response.usage().totalTokens() : 0,
                    System.currentTimeMillis() - start);

            return response;

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("OpenAI rate limit exceeded");
            throw new AiServiceException("AI 서비스 요청 한도 초과. 잠시 후 다시 시도해주세요.", e);
        } catch (HttpClientErrorException.Unauthorized e) {
            log.error("OpenAI API key invalid");
            throw new AiServiceException("AI 서비스 인증 오류", e);
        } catch (Exception e) {
            log.error("OpenAI call failed: {}", e.getMessage());
            throw new AiServiceException("AI 서비스 일시적 오류", e);
        }
    }

    /**
     * 스트리밍 Chat Completions (SSE)
     * stream=true 모드로 호출, delta 텍스트를 Flux로 방출
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
                .doOnError(e -> log.error("OpenAI stream error: {}", e.getMessage()));
    }
}
