package com.livemart.product.controller;

import com.livemart.common.ratelimit.RateLimit;
import com.livemart.common.versioning.ApiVersion;
import com.livemart.product.dto.ProductResponse;
import com.livemart.product.reactive.ReactiveProductQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;

/**
 * 반응형 상품 조회 API
 * WebFlux 기반 논블로킹 I/O
 */
@RestController
@RequestMapping("/api/v2/products")
@RequiredArgsConstructor
@Tag(name = "Reactive Product API", description = "반응형 상품 조회 API")
@ApiVersion(2)
public class ReactiveProductController {

    private final ReactiveProductQueryService reactiveQueryService;

    @Operation(summary = "상품 조회 (반응형)", description = "단일 상품을 비동기로 조회합니다")
    @GetMapping("/{productId}")
    @RateLimit(name = "product-get", limitForPeriod = 100, refreshPeriodSeconds = 60)
    public Mono<ProductResponse> getProduct(@PathVariable Long productId) {
        return reactiveQueryService.getProductReactive(productId);
    }

    @Operation(summary = "상품 목록 스트리밍", description = "상품 목록을 Server-Sent Events로 스트리밍합니다")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @RateLimit(name = "product-stream", limitForPeriod = 10, refreshPeriodSeconds = 60)
    public Flux<ProductResponse> streamProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return reactiveQueryService.getProductsReactive(page, size);
    }

    @Operation(summary = "가격 범위 검색 (스트리밍)", description = "가격 범위 내 상품을 실시간으로 스트리밍합니다")
    @GetMapping(value = "/search/price-range", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @RateLimit(name = "price-search", limitForPeriod = 20, refreshPeriodSeconds = 60)
    public Flux<ProductResponse> searchByPriceRange(
            @RequestParam BigDecimal minPrice,
            @RequestParam BigDecimal maxPrice
    ) {
        return reactiveQueryService.searchByPriceRange(minPrice, maxPrice);
    }

    @Operation(summary = "카테고리별 상품 조회 (반응형)", description = "특정 카테고리의 상품을 비동기로 조회합니다")
    @GetMapping("/category/{categoryId}")
    @RateLimit(name = "category-products", limitForPeriod = 50, refreshPeriodSeconds = 60)
    public Flux<ProductResponse> getProductsByCategory(@PathVariable Long categoryId) {
        return reactiveQueryService.getProductsByCategory(categoryId);
    }

    @Operation(summary = "재고 부족 상품 알림 (SSE)", description = "재고가 부족한 상품을 실시간으로 알림합니다")
    @GetMapping(value = "/alerts/low-stock", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @RateLimit(name = "low-stock-alert", limitForPeriod = 5, refreshPeriodSeconds = 60, keyType = RateLimit.KeyType.IP)
    public Flux<ProductResponse> getLowStockAlerts(
            @RequestParam(defaultValue = "10") Integer threshold
    ) {
        return reactiveQueryService.getLowStockProducts(threshold);
    }

    @Operation(summary = "다중 상품 배치 조회", description = "여러 상품을 병렬로 조회합니다")
    @PostMapping("/batch")
    @RateLimit(name = "product-batch", limitForPeriod = 10, refreshPeriodSeconds = 60)
    public Flux<ProductResponse> getProductsBatch(@RequestBody Flux<Long> productIds) {
        return reactiveQueryService.getProductsBatch(productIds);
    }
}
