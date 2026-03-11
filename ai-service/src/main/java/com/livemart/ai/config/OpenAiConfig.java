package com.livemart.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * OpenAI REST 클라이언트 설정 (WebFlux 전용)
 *
 * build.gradle에서 spring-boot-starter-web 제거 → WebFlux(Reactor Netty) 단독 사용.
 * RestClient는 Spring MVC 전용이므로 WebClient 하나로 통일:
 * - 동기 호출: webClient.post().retrieve().bodyToMono().block() — 추천/설명생성
 * - 스트리밍: webClient.post().retrieve().bodyToFlux()          — 챗봇 SSE
 */
@Configuration
public class OpenAiConfig {

    @Value("${openai.api.key:${OPENAI_API_KEY:}}")
    private String apiKey;

    @Value("${openai.api.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Bean
    public WebClient openAiWebClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(2 * 1024 * 1024)) // 2MB
                .build();
    }
}
