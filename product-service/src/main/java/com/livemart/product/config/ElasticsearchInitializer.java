package com.livemart.product.config;

import com.livemart.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 서비스 시작 시 Elasticsearch 자동 reindex
 * - ApplicationReadyEvent: 모든 Bean 초기화 + DB 연결 완료 후 실행
 * - @Async: 메인 스레드 블로킹 없이 백그라운드 실행
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ElasticsearchInitializer {

    private final ProductService productService;

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Elasticsearch 자동 reindex 시작...");
        try {
            int count = productService.reindexAllProducts();
            log.info("Elasticsearch 자동 reindex 완료: {}건", count);
        } catch (Exception e) {
            log.warn("Elasticsearch 자동 reindex 실패 (서비스 동작에는 영향 없음): {}", e.getMessage());
        }
    }
}
