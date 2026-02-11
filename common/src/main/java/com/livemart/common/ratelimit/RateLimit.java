package com.livemart.common.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Rate Limiting 어노테이션
 *
 * 사용 예시:
 * @RateLimit(name = "search-api", limitForPeriod = 10, refreshPeriodSeconds = 60)
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    /**
     * Rate Limiter 이름
     */
    String name();

    /**
     * 기간 내 최대 요청 수
     */
    int limitForPeriod() default 100;

    /**
     * 갱신 기간 (초)
     */
    int refreshPeriodSeconds() default 60;

    /**
     * 타임아웃 (초)
     */
    int timeoutSeconds() default 5;

    /**
     * Rate Limit Key 타입
     */
    KeyType keyType() default KeyType.METHOD;

    enum KeyType {
        METHOD,  // 메서드별
        IP,      // IP별
        USER     // 사용자별
    }
}
