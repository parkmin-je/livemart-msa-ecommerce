package com.livemart.notification.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.notification.domain.Notification;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisReactiveConfig {

    /**
     * 타입 기반 Redis 템플릿: notifications:user:{userId} LIST 저장/조회용
     * ObjectMapper는 Spring Boot JacksonAutoConfiguration이 제공 (JavaTimeModule 포함)
     */
    @Bean
    public ReactiveRedisTemplate<String, Notification> reactiveRedisTemplate(
            ReactiveRedisConnectionFactory connectionFactory,
            ObjectMapper objectMapper) {

        Jackson2JsonRedisSerializer<Notification> serializer =
                new Jackson2JsonRedisSerializer<>(objectMapper, Notification.class);

        RedisSerializationContext<String, Notification> context = RedisSerializationContext
                .<String, Notification>newSerializationContext(new StringRedisSerializer())
                .value(serializer)
                .build();

        return new ReactiveRedisTemplate<>(connectionFactory, context);
    }

    /**
     * String 기반 Redis 템플릿: Pub/Sub 발행(convertAndSend) 및 구독(listenToChannel)용
     *
     * notification:events 채널로 JSON 문자열을 pub/sub하여
     * 다중 인스턴스 간 SSE 알림 동기화에 사용
     */
    @Bean
    public ReactiveRedisTemplate<String, String> stringReactiveRedisTemplate(
            ReactiveRedisConnectionFactory connectionFactory) {
        return new ReactiveRedisTemplate<>(connectionFactory, RedisSerializationContext.string());
    }
}
