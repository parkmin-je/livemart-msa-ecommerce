package com.livemart.gateway.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

import java.time.Duration;

/**
 * API Gateway Redis 연결 설정
 *
 * Kubernetes에서 Lettuce SharedConnection 모드의 InterruptedException 버그 수정:
 * - Spring Boot 자동 구성의 redisConnectionFactory 빈을 오버라이드
 * - shareNativeConnection = false → 연결 공유 비활성화 (각 요청마다 독립 연결)
 * - connectTimeout = 2s → 빠른 연결 실패 감지
 */
@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host:redis}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    /**
     * redisConnectionFactory 빈 오버라이드.
     * 반환 타입을 LettuceConnectionFactory로 선언해야 Spring Boot 자동구성의
     * @ConditionalOnMissingBean(RedisConnectionFactory.class) AND
     * @ConditionalOnMissingBean(ReactiveRedisConnectionFactory.class) 두 가지를 모두 만족시킴.
     * 반환 타입이 인터페이스면 ReactiveRedisConnectionFactory 조건이 충족되지 않아
     * SharedConnection 모드의 별도 자동구성 빈이 생성되는 문제가 있음.
     */
    @Bean
    @Primary
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration serverConfig = new RedisStandaloneConfiguration(redisHost, redisPort);

        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
                .clientOptions(ClientOptions.builder()
                        .socketOptions(SocketOptions.builder()
                                .connectTimeout(Duration.ofSeconds(2))
                                .build())
                        .build())
                .commandTimeout(Duration.ofSeconds(5))
                .build();

        LettuceConnectionFactory factory = new LettuceConnectionFactory(serverConfig, clientConfig);
        // SharedConnection 비활성화 — Reactor Scheduler 스레드에서 InterruptedException 방지
        factory.setShareNativeConnection(false);
        factory.setValidateConnection(false);
        factory.afterPropertiesSet();  // 즉시 초기화하여 첫 요청 지연 방지
        return factory;
    }
}
