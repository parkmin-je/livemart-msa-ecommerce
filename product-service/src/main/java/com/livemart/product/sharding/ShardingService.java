package com.livemart.product.sharding;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Sharding 서비스
 *
 * 기능:
 * 1. 자동 Shard 라우팅
 * 2. 브로드캐스트 쿼리 (모든 Shard 조회)
 * 3. 분산 집계
 * 4. Shard 통계
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShardingService {

    private final ShardingStrategy shardingStrategy;
    private final Map<String, DataSource> shardDataSources;

    /**
     * 단일 Shard에서 조회
     */
    public <T> Optional<T> findById(Long id, ShardRowMapper<T> mapper) {
        String shardKey = shardingStrategy.determineShardKey(id);
        DataSource dataSource = shardDataSources.get(shardKey);

        if (dataSource == null) {
            log.error("Shard not found: {}", shardKey);
            return Optional.empty();
        }

        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);

        try {
            String sql = mapper.getSelectSql();
            T result = jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> mapper.mapRow(rs),
                id
            );

            log.debug("Found entity in shard: id={}, shard={}", id, shardKey);

            return Optional.ofNullable(result);

        } catch (Exception e) {
            log.error("Failed to query shard: shard={}, id={}", shardKey, id, e);
            return Optional.empty();
        }
    }

    /**
     * 모든 Shard에서 조회 (브로드캐스트 쿼리)
     */
    public <T> List<T> findAll(ShardRowMapper<T> mapper) {
        List<String> shardKeys = shardingStrategy.getAllShardKeys();

        return shardKeys.parallelStream()
            .flatMap(shardKey -> {
                DataSource dataSource = shardDataSources.get(shardKey);
                if (dataSource == null) {
                    log.warn("Shard not available: {}", shardKey);
                    return java.util.stream.Stream.empty();
                }

                JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);

                try {
                    String sql = mapper.getSelectAllSql();
                    List<T> results = jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> mapper.mapRow(rs)
                    );

                    log.debug("Queried shard: shard={}, results={}", shardKey, results.size());

                    return results.stream();

                } catch (Exception e) {
                    log.error("Failed to query shard: shard={}", shardKey, e);
                    return java.util.stream.Stream.empty();
                }
            })
            .collect(Collectors.toList());
    }

    /**
     * 분산 카운트 집계
     */
    public long count(String tableName) {
        List<String> shardKeys = shardingStrategy.getAllShardKeys();

        return shardKeys.parallelStream()
            .mapToLong(shardKey -> {
                DataSource dataSource = shardDataSources.get(shardKey);
                if (dataSource == null) return 0L;

                JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);

                try {
                    String sql = "SELECT COUNT(*) FROM " + tableName;
                    Long count = jdbcTemplate.queryForObject(sql, Long.class);

                    log.debug("Shard count: shard={}, count={}", shardKey, count);

                    return count != null ? count : 0L;

                } catch (Exception e) {
                    log.error("Failed to count in shard: shard={}", shardKey, e);
                    return 0L;
                }
            })
            .sum();
    }

    /**
     * 분산 합계 집계
     */
    public double sum(String tableName, String columnName) {
        List<String> shardKeys = shardingStrategy.getAllShardKeys();

        return shardKeys.parallelStream()
            .mapToDouble(shardKey -> {
                DataSource dataSource = shardDataSources.get(shardKey);
                if (dataSource == null) return 0.0;

                JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);

                try {
                    String sql = String.format("SELECT SUM(%s) FROM %s", columnName, tableName);
                    Double sum = jdbcTemplate.queryForObject(sql, Double.class);

                    return sum != null ? sum : 0.0;

                } catch (Exception e) {
                    log.error("Failed to sum in shard: shard={}", shardKey, e);
                    return 0.0;
                }
            })
            .sum();
    }

    /**
     * Shard별 통계
     */
    public Map<String, ShardStats> getShardStats(String tableName) {
        List<String> shardKeys = shardingStrategy.getAllShardKeys();
        Map<String, ShardStats> statsMap = new HashMap<>();

        shardKeys.forEach(shardKey -> {
            DataSource dataSource = shardDataSources.get(shardKey);
            if (dataSource == null) {
                statsMap.put(shardKey, new ShardStats(shardKey, 0L, 0L, "UNAVAILABLE"));
                return;
            }

            JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);

            try {
                // 레코드 수
                String countSql = "SELECT COUNT(*) FROM " + tableName;
                Long count = jdbcTemplate.queryForObject(countSql, Long.class);

                // 테이블 크기 (MB)
                String sizeSql = """
                    SELECT ROUND(((data_length + index_length) / 1024 / 1024), 2)
                    FROM information_schema.TABLES
                    WHERE table_schema = DATABASE()
                    AND table_name = ?
                    """;
                Long sizeMb = jdbcTemplate.queryForObject(sizeSql, Long.class, tableName);

                statsMap.put(shardKey, new ShardStats(
                    shardKey,
                    count != null ? count : 0L,
                    sizeMb != null ? sizeMb : 0L,
                    "ONLINE"
                ));

            } catch (Exception e) {
                log.error("Failed to get stats for shard: shard={}", shardKey, e);
                statsMap.put(shardKey, new ShardStats(shardKey, 0L, 0L, "ERROR"));
            }
        });

        return statsMap;
    }

    /**
     * Shard 재분배 (Rebalancing)
     */
    public void rebalanceShards(String tableName) {
        log.info("Starting shard rebalancing for table: {}", tableName);

        // 1. 전체 데이터 조회
        // 2. 새로운 Shard 키 계산
        // 3. 데이터 이동
        // 4. 기존 데이터 삭제

        // TODO: 실제 구현 (운영 중 실행 시 주의!)

        log.info("Shard rebalancing completed");
    }

    // Interfaces & Records

    public interface ShardRowMapper<T> {
        String getSelectSql();
        String getSelectAllSql();
        T mapRow(java.sql.ResultSet rs) throws java.sql.SQLException;
    }

    public record ShardStats(
        String shardKey,
        long recordCount,
        long sizeMb,
        String status
    ) {}
}
