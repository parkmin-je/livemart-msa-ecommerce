package com.livemart.common.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import io.lettuce.core.TimeoutOptions;
import io.lettuce.core.cluster.ClusterClientOptions;
import io.lettuce.core.cluster.ClusterTopologyRefreshOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisClusterConfiguration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

/**
 * Redis Cluster 고가용성 설정
 *
 * 특징:
 * 1. Cluster 모드 (데이터 샤딩)
 * 2. 자동 Failover
 * 3. 읽기 복제본 활용
 * 4. 연결 풀 최적화
 * 5. 자동 재연결
 */
@Configuration
@Slf4j
public class RedisClusterConfig {

    @Value("${spring.redis.cluster.nodes:localhost:7000,localhost:7001,localhost:7002}")
    private String clusterNodes;

    @Value("${spring.redis.cluster.max-redirects:3}")
    private int maxRedirects;

    @Value("${spring.redis.password:}")
    private String password;

    /**
     * Redis Cluster 설정
     */
    @Bean
    public RedisClusterConfiguration redisClusterConfiguration() {
        List<String> nodes = Arrays.asList(clusterNodes.split(","));

        RedisClusterConfiguration clusterConfig = new RedisClusterConfiguration(nodes);
        clusterConfig.setMaxRedirects(maxRedirects);

        if (password != null && !password.isEmpty()) {
            clusterConfig.setPassword(password);
        }

        log.info("Redis Cluster configuration: nodes={}, maxRedirects={}",
                 nodes, maxRedirects);

        return clusterConfig;
    }

    /**
     * Lettuce Client 설정 (고급 옵션)
     */
    @Bean
    public LettuceClientConfiguration lettuceClientConfiguration() {
        // Cluster Topology 자동 갱신 설정
        ClusterTopologyRefreshOptions topologyRefreshOptions = ClusterTopologyRefreshOptions.builder()
            .enablePeriodicRefresh(Duration.ofMinutes(5))  // 5분마다 토폴로지 갱신
            .enableAllAdaptiveRefreshTriggers()             // 모든 이벤트에 adaptive refresh
            .build();

        // Socket 옵션
        SocketOptions socketOptions = SocketOptions.builder()
            .connectTimeout(Duration.ofSeconds(10))
            .keepAlive(true)
            .build();

        // Timeout 옵션
        TimeoutOptions timeoutOptions = TimeoutOptions.enabled(Duration.ofSeconds(3));

        // Cluster Client 옵션
        ClusterClientOptions clientOptions = ClusterClientOptions.builder()
            .topologyRefreshOptions(topologyRefreshOptions)
            .socketOptions(socketOptions)
            .timeoutOptions(timeoutOptions)
            .autoReconnect(true)                            // 자동 재연결
            .disconnectedBehavior(ClientOptions.DisconnectedBehavior.REJECT_COMMANDS)
            .validateClusterNodeMembership(false)           // 클러스터 멤버십 검증 비활성화
            .build();

        return LettuceClientConfiguration.builder()
            .clientOptions(clientOptions)
            .commandTimeout(Duration.ofSeconds(5))
            .shutdownTimeout(Duration.ofSeconds(2))
            .build();
    }

    /**
     * Redis Connection Factory
     */
    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory(
            RedisClusterConfiguration clusterConfig,
            LettuceClientConfiguration clientConfig) {

        LettuceConnectionFactory factory = new LettuceConnectionFactory(
            clusterConfig,
            clientConfig
        );

        // 연결 공유 활성화 (성능 향상)
        factory.setShareNativeConnection(true);

        // 연결 검증
        factory.setValidateConnection(true);

        log.info("Redis Connection Factory created with Cluster support");

        return factory;
    }

    /**
     * RedisTemplate (JSON 직렬화)
     */
    @Bean
    @Primary
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Key Serializer (String)
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);

        // Value Serializer (JSON)
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.setEnableTransactionSupport(true);
        template.afterPropertiesSet();

        log.info("RedisTemplate configured with JSON serialization");

        return template;
    }

    /**
     * String 전용 RedisTemplate
     */
    @Bean
    public RedisTemplate<String, String> stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setValueSerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setHashValueSerializer(stringSerializer);

        template.afterPropertiesSet();

        return template;
    }
}
