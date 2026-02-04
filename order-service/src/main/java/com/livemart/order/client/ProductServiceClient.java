package com.livemart.order.client;

import com.livemart.order.dto.ProductInfo;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductServiceClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${service.product-url}")
    private String productServiceUrl;

    @CircuitBreaker(name = "productService", fallbackMethod = "getProductInfoFallback")
    public ProductInfo getProductInfo(Long productId) {
        log.info("Calling Product Service for productId: {}", productId);

        return webClientBuilder.build()
                .get()
                .uri(productServiceUrl + "/api/products/" + productId)
                .retrieve()
                .bodyToMono(ProductInfo.class)
                .timeout(Duration.ofSeconds(3))
                .block();
    }

    @CircuitBreaker(name = "productService", fallbackMethod = "updateStockFallback")
    public void updateStock(Long productId, Integer quantity) {
        log.info("Updating stock for productId: {}, quantity: {}", productId, quantity);

        webClientBuilder.build()
                .patch()
                .uri(productServiceUrl + "/api/products/" + productId + "/stock?quantity=" + quantity)
                .retrieve()
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(3))
                .block();
    }

    // Circuit Breaker Fallback
    private ProductInfo getProductInfoFallback(Long productId, Exception e) {
        log.error("Product Service is down. Fallback for productId: {}", productId, e);
        throw new RuntimeException("상품 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }

    private void updateStockFallback(Long productId, Integer quantity, Exception e) {
        log.error("Failed to update stock for productId: {}", productId, e);
        throw new RuntimeException("재고 업데이트에 실패했습니다.");
    }
}