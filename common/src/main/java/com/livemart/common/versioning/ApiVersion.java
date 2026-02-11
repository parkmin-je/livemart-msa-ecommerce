package com.livemart.common.versioning;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * API 버전 관리 어노테이션
 *
 * 사용 예시:
 * @ApiVersion(1)
 * @GetMapping("/products")
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiVersion {
    int value() default 1;
}
