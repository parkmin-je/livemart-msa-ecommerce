package com.livemart.ai.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.dto.OpenAiRequest;
import com.livemart.ai.dto.OpenAiResponse;
import com.livemart.ai.exception.AiServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

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
    private static final String EMBEDDING_PATH = "/embeddings";
    private static final String EMBEDDING_MODEL = "text-embedding-3-small";
    private static final Duration SYNC_TIMEOUT = Duration.ofSeconds(30);

    private final WebClient openAiWebClient;
    private final ObjectMapper objectMapper;

    @Value("${openai.api.key:}")
    private String apiKey;

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
     * 편의 메서드: system/user 메시지로 간단한 chatCompletion 호출
     * ProductVectorStoreService의 RAG 패턴에서 사용
     */
    public String chatCompletion(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OPENAI_API_KEY 미설정 — 데모 응답 반환");
            return "{\"recommendations\": []}";
        }

        OpenAiRequest request = new OpenAiRequest(
            "gpt-4o-mini",
            List.of(
                new OpenAiRequest.Message("system", systemPrompt),
                new OpenAiRequest.Message("user", userPrompt)
            ),
            null, false
        );

        try {
            OpenAiResponse response = chat(request);
            if (response != null && response.choices() != null && !response.choices().isEmpty()) {
                var message = response.choices().get(0).message();
                return message != null ? message.content() : "{}";
            }
        } catch (Exception e) {
            log.error("chatCompletion 실패: {}", e.getMessage());
        }
        return "{}";
    }

    /**
     * OpenAI Embedding API 호출 — 텍스트를 벡터로 변환
     * Spring AI VectorStore.add()의 내부 동작과 동일한 패턴
     *
     * @param text 임베딩할 텍스트
     * @return float 배열 (dimension=1536 for text-embedding-3-small)
     */
    @SuppressWarnings("unchecked")
    public double[] createEmbedding(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("OPENAI_API_KEY 미설정 — null 반환 (ProductVectorStoreService가 데모 벡터 사용)");
            return null;
        }

        try {
            Map<String, Object> requestBody = Map.of(
                "model", EMBEDDING_MODEL,
                "input", text,
                "encoding_format", "float"
            );

            Map<?, ?> response = openAiWebClient.post()
                .uri(EMBEDDING_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(SYNC_TIMEOUT)
                .block();

            if (response == null) return null;

            List<?> data = (List<?>) response.get("data");
            if (data == null || data.isEmpty()) return null;

            Map<?, ?> firstItem = (Map<?, ?>) data.get(0);
            List<?> embeddingList = (List<?>) firstItem.get("embedding");
            if (embeddingList == null) return null;

            double[] result = new double[embeddingList.size()];
            for (int i = 0; i < embeddingList.size(); i++) {
                result[i] = ((Number) embeddingList.get(i)).doubleValue();
            }

            log.debug("임베딩 생성 완료: dimension={}, model={}", result.length, EMBEDDING_MODEL);
            return result;

        } catch (Exception e) {
            log.error("임베딩 생성 실패: {}", e.getMessage());
            return null;
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
