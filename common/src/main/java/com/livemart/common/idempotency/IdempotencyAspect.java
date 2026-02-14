package com.livemart.common.idempotency;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class IdempotencyAspect {

    private static final String HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";
    private static final String KEY_PREFIX = "idempotency:";

    private final StringRedisTemplate redisTemplate;

    @Around("@annotation(idempotencyKey)")
    public Object checkIdempotency(ProceedingJoinPoint joinPoint, IdempotencyKey idempotencyKey) throws Throwable {
        var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return joinPoint.proceed();
        }

        String key = attrs.getRequest().getHeader(HEADER_IDEMPOTENCY_KEY);
        if (key == null || key.isBlank()) {
            return joinPoint.proceed();
        }

        String redisKey = KEY_PREFIX + idempotencyKey.prefix() + ":" + key;
        Boolean isNew = redisTemplate.opsForValue()
                .setIfAbsent(redisKey, "PROCESSING", Duration.ofSeconds(idempotencyKey.ttlSeconds()));

        if (Boolean.FALSE.equals(isNew)) {
            String status = redisTemplate.opsForValue().get(redisKey);
            log.warn("Duplicate request detected for idempotency key: {}, status: {}", key, status);
            throw new IllegalStateException("Duplicate request. Idempotency key already processed: " + key);
        }

        try {
            Object result = joinPoint.proceed();
            redisTemplate.opsForValue().set(redisKey, "COMPLETED", Duration.ofSeconds(idempotencyKey.ttlSeconds()));
            return result;
        } catch (Exception e) {
            redisTemplate.delete(redisKey);
            throw e;
        }
    }
}
