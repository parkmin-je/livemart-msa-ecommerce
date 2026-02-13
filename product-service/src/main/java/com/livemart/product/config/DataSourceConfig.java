package com.livemart.product.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

/**
 * HikariCP 커넥션 풀 최적화 설정
 *
 * 성능 최적화 전략:
 * 1. 최적 풀 크기 계산: connections = ((core_count * 2) + effective_spindle_count)
 * 2. Connection Leak Detection 설정
 * 3. Connection Timeout 최적화
 * 4. Statement Caching 활성화
 * 5. 모니터링 메트릭 수집
 */
@Configuration
@Slf4j
public class DataSourceConfig {

    /**
     * HikariCP 데이터소스 설정
     *
     * 최적화 가이드라인:
     * - CPU 코어 수: 8 core
     * - Disk: SSD (effective_spindle_count = 1)
     * - 최적 풀 크기: (8 * 2) + 1 = 17
     * - 예비 20% 추가: 20개 설정
     */
    @Bean
    @Primary
    @ConfigurationProperties(prefix = "spring.datasource.hikari")
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // Connection Pool Size
        config.setMaximumPoolSize(20);           // 최대 커넥션 수
        config.setMinimumIdle(5);                 // 최소 유휴 커넥션 수
        config.setConnectionTimeout(30000);       // 30초 (커넥션 획득 대기)
        config.setIdleTimeout(600000);            // 10분 (유휴 커넥션 제거 시간)
        config.setMaxLifetime(1800000);           // 30분 (커넥션 최대 생존 시간)
        config.setValidationTimeout(5000);        // 5초 (커넥션 검증 타임아웃)

        // Connection Leak Detection
        config.setLeakDetectionThreshold(60000);  // 60초 이상 반환 안 되면 leak 경고

        // Performance Tuning
        config.setAutoCommit(true);
        config.setConnectionTestQuery("SELECT 1");
        config.setPoolName("LiveMart-HikariCP");

        // PostgreSQL Specific Settings
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");

        // Connection Properties from application.yml
        config.setJdbcUrl(getJdbcUrl());
        config.setUsername(getUsername());
        config.setPassword(getPassword());
        config.setDriverClassName("org.postgresql.Driver");

        // Health Check
        config.setHealthCheckRegistry(null); // Prometheus 등록은 별도 처리

        HikariDataSource dataSource = new HikariDataSource(config);

        log.info("HikariCP DataSource configured: maxPoolSize={}, minIdle={}, leakDetectionThreshold={}ms",
                 config.getMaximumPoolSize(), config.getMinimumIdle(), config.getLeakDetectionThreshold());

        return dataSource;
    }

    // application.yml에서 읽어올 속성들
    private String getJdbcUrl() {
        return System.getProperty("spring.datasource.url",
                "jdbc:postgresql://localhost:5435/productdb");
    }

    private String getUsername() {
        return System.getProperty("spring.datasource.username", "productapp");
    }

    private String getPassword() {
        return System.getProperty("spring.datasource.password", "product123");
    }
}
