package com.livemart.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * OpenAI REST 클라이언트 설정
 *
 * Spring AI BOM(M6) 대신 순수 RestClient/WebClient로 직접 호출.
 * 이유: Spring AI 1.0.0-M6은 마일스톤 버전으로 프로덕션 불안정
 * → HTTP 직접 호출로 SDK 의존성 없이 동일 기능 구현
 */
@Configuration
public class OpenAiConfig {

    @Value("${openai.api.key:${OPENAI_API_KEY:}}")
    private String apiKey;

    @Value("${openai.api.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    /**
     * 동기 호출용 RestClient (상품 추천, 설명 생성)
     */
    @Bean
    public RestClient openAiRestClient() {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * 비동기 스트리밍용 WebClient (챗봇 SSE)
     */
    @Bean
    public WebClient openAiWebClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}
