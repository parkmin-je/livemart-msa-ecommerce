package com.livemart.product.sharding;

import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * Sharding 전략 인터페이스
 */
public interface ShardingStrategy {

    /**
     * Shard 결정
     */
    String determineShardKey(Long entityId);

    /**
     * 전체 Shard 조회 (브로드캐스트 쿼리용)
     */
    List<String> getAllShardKeys();
}

/**
 * Hash 기반 Sharding 전략
 *
 * 알고리즘: entityId % shardCount
 */
@Slf4j
class HashBasedShardingStrategy implements ShardingStrategy {

    private static final int SHARD_COUNT = 3;

    @Override
    public String determineShardKey(Long entityId) {
        if (entityId == null) {
            throw new IllegalArgumentException("Entity ID cannot be null");
        }

        int shardIndex = (int) (entityId % SHARD_COUNT);
        String shardKey = "shard" + shardIndex;

        log.debug("Determined shard: entityId={}, shard={}", entityId, shardKey);

        return shardKey;
    }

    @Override
    public List<String> getAllShardKeys() {
        return List.of("shard0", "shard1", "shard2");
    }
}

/**
 * Range 기반 Sharding 전략
 *
 * 범위:
 * - Shard 0: 0 ~ 999,999
 * - Shard 1: 1,000,000 ~ 1,999,999
 * - Shard 2: 2,000,000 ~ 2,999,999
 */
@Slf4j
class RangeBasedShardingStrategy implements ShardingStrategy {

    private static final long RANGE_SIZE = 1_000_000;

    @Override
    public String determineShardKey(Long entityId) {
        if (entityId == null) {
            throw new IllegalArgumentException("Entity ID cannot be null");
        }

        int shardIndex = (int) (entityId / RANGE_SIZE);
        String shardKey = "shard" + shardIndex;

        log.debug("Determined shard: entityId={}, shard={}", entityId, shardKey);

        return shardKey;
    }

    @Override
    public List<String> getAllShardKeys() {
        return List.of("shard0", "shard1", "shard2");
    }
}

/**
 * Geographic 기반 Sharding 전략
 *
 * 지역별 분산:
 * - Shard 0: 서울/경기
 * - Shard 1: 부산/경남
 * - Shard 2: 기타 지역
 */
@Slf4j
class GeographicShardingStrategy implements ShardingStrategy {

    @Override
    public String determineShardKey(Long entityId) {
        // 실제로는 지역 정보를 조회해야 함
        // 여기서는 간단히 Hash 기반으로 시뮬레이션
        int shardIndex = (int) (entityId % 3);
        return "shard" + shardIndex;
    }

    @Override
    public List<String> getAllShardKeys() {
        return List.of("shard0", "shard1", "shard2");
    }
}
