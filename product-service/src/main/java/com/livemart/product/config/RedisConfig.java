package com.livemart.product.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.livemart.product.websocket.StockWebSocketHandler;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // ObjectMapper에 JavaTimeModule 추가
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // 허용된 패키지만 역직렬화 가능하도록 화이트리스트 기반 타입 검증
        // (NON_FINAL + LaissezFaireSubTypeValidator 조합은 RCE 취약점 - CVE 계열)
        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType("com.livemart.")
                .allowIfSubType("java.util.")
                .allowIfSubType("java.lang.")
                .allowIfSubType("java.math.")
                .allowIfSubType("java.time.")
                .build();
        objectMapper.activateDefaultTyping(ptv, ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.PROPERTY);

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);

        // Key는 String으로 직렬화
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Value는 JSON으로 직렬화
        template.setValueSerializer(serializer);
        template.setHashValueSerializer(serializer);

        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // ObjectMapper에 JavaTimeModule 추가
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // 허용된 패키지만 역직렬화 가능하도록 화이트리스트 기반 타입 검증
        // (NON_FINAL + LaissezFaireSubTypeValidator 조합은 RCE 취약점 - CVE 계열)
        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType("com.livemart.")
                .allowIfSubType("java.util.")
                .allowIfSubType("java.lang.")
                .allowIfSubType("java.math.")
                .allowIfSubType("java.time.")
                .build();
        objectMapper.activateDefaultTyping(ptv, ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.PROPERTY);

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(serializer));

        // 캐시별 TTL 세분화
        RedisCacheConfiguration shortTtl = config.entryTtl(Duration.ofMinutes(5));
        RedisCacheConfiguration longTtl = config.entryTtl(Duration.ofHours(1));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .withCacheConfiguration("products", longTtl)
                .withCacheConfiguration("product-detail", shortTtl)
                .withCacheConfiguration("categories", longTtl)
                .withCacheConfiguration("product-search", shortTtl)
                .build();
    }

    // ── Redis Pub/Sub: WebSocket 다중 인스턴스 브로드캐스트 ─────────────────────

    @Bean
    public MessageListenerAdapter stockUpdateListener(StockWebSocketHandler handler) {
        MessageListenerAdapter adapter = new MessageListenerAdapter(handler, "handleStockUpdate");
        adapter.setSerializer(new StringRedisSerializer());
        return adapter;
    }

    @Bean
    public MessageListenerAdapter lowStockAlertListener(StockWebSocketHandler handler) {
        MessageListenerAdapter adapter = new MessageListenerAdapter(handler, "handleLowStockAlert");
        adapter.setSerializer(new StringRedisSerializer());
        return adapter;
    }

    /**
     * Redis Pub/Sub 리스너 컨테이너
     * stock:updates      → StockWebSocketHandler.handleStockUpdate()
     * stock:low-alerts   → StockWebSocketHandler.handleLowStockAlert()
     */
    @Bean
    public RedisMessageListenerContainer stockMessageListenerContainer(
            RedisConnectionFactory connectionFactory,
            MessageListenerAdapter stockUpdateListener,
            MessageListenerAdapter lowStockAlertListener) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(stockUpdateListener,
                new ChannelTopic(StockWebSocketHandler.STOCK_UPDATE_CHANNEL));
        container.addMessageListener(lowStockAlertListener,
                new ChannelTopic(StockWebSocketHandler.LOW_STOCK_CHANNEL));
        return container;
    }
}