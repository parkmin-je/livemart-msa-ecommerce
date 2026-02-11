package com.livemart.product.sharding;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Database Sharding 설정
 *
 * 수평 확장 전략:
 * 1. Range-based Sharding (범위 기반)
 * 2. Hash-based Sharding (해시 기반)
 * 3. Geographic Sharding (지역 기반)
 * 4. 자동 라우팅
 */
@Configuration
@Slf4j
public class DatabaseShardingConfig {

    /**
     * Sharding 전략 설정
     */
    @Bean
    public ShardingStrategy shardingStrategy() {
        return new HashBasedShardingStrategy();
    }

    /**
     * Shard 데이터소스 맵
     */
    @Bean
    public Map<String, DataSource> shardDataSources() {
        Map<String, DataSource> shards = new HashMap<>();

        // Shard 0: 상품 ID 0 ~ 999,999
        shards.put("shard0", createDataSource("localhost", 3306, "livemart_product_shard0"));

        // Shard 1: 상품 ID 1,000,000 ~ 1,999,999
        shards.put("shard1", createDataSource("localhost", 3307, "livemart_product_shard1"));

        // Shard 2: 상품 ID 2,000,000 ~ 2,999,999
        shards.put("shard2", createDataSource("localhost", 3308, "livemart_product_shard2"));

        log.info("Configured {} database shards", shards.size());

        return shards;
    }

    private DataSource createDataSource(String host, int port, String database) {
        // HikariCP DataSource 생성 (간단한 구현)
        org.springframework.jdbc.datasource.DriverManagerDataSource ds =
            new org.springframework.jdbc.datasource.DriverManagerDataSource();

        ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
        ds.setUrl(String.format("jdbc:mysql://%s:%d/%s?useSSL=false&serverTimezone=Asia/Seoul",
                                host, port, database));
        ds.setUsername("root");
        ds.setPassword("1234");

        return ds;
    }
}
