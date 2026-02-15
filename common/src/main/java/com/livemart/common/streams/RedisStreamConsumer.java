package com.livemart.common.streams;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Slf4j
@Component
@ConditionalOnBean(StringRedisTemplate.class)
public class RedisStreamConsumer {

    private final StringRedisTemplate redisTemplate;

    public RedisStreamConsumer(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void createConsumerGroup(String streamKey, String groupName) {
        try {
            redisTemplate.opsForStream().createGroup(streamKey, ReadOffset.from("0"), groupName);
            log.info("Consumer group created: stream={}, group={}", streamKey, groupName);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                log.debug("Consumer group already exists: stream={}, group={}", streamKey, groupName);
            } else {
                log.warn("Failed to create consumer group: stream={}, group={}", streamKey, groupName, e);
            }
        }
    }

    public void acknowledge(String streamKey, String groupName, RecordId recordId) {
        redisTemplate.opsForStream().acknowledge(streamKey, groupName, recordId);
    }

    public StreamMessageListenerContainer.StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>>
    defaultContainerOptions() {
        return StreamMessageListenerContainer.StreamMessageListenerContainerOptions.builder()
                .pollTimeout(Duration.ofSeconds(2))
                .batchSize(10)
                .build();
    }
}
