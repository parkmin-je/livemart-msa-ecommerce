package com.livemart.order.batch;

import org.springframework.batch.core.configuration.annotation.EnableBatchProcessing;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Spring Batch 설정
 * - 일일 매출 정산 배치
 * - 월별 리포트 배치
 * - 미처리 주문 알림 배치
 */
@Configuration
@EnableScheduling
public class BatchConfig {
    // Spring Boot 3.x에서는 @EnableBatchProcessing 사용 시 자동 설정이 비활성화되므로
    // 기본 자동 설정을 사용합니다.
}
