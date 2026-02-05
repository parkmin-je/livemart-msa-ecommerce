package com.livemart.order.client;

import com.livemart.order.dto.ProductInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductServiceClient {

    private final RestTemplate restTemplate;
    private static final String PRODUCT_SERVICE_URL = "http://PRODUCT-SERVICE/api/products";

    // 일반 조회
    public ProductInfo getProduct(Long productId) {
        log.info("Calling Product Service for productId: {}", productId);
        String url = PRODUCT_SERVICE_URL + "/" + productId;
        return restTemplate.getForObject(url, ProductInfo.class);
    }

    // 락을 사용한 조회 (주문 시 사용)
    public ProductInfo getProductWithLock(Long productId) {
        log.info("Calling Product Service WITH LOCK for productId: {}", productId);
        String url = PRODUCT_SERVICE_URL + "/" + productId + "/with-lock";
        return restTemplate.getForObject(url, ProductInfo.class);
    }

    public void updateStock(Long productId, int newStock) {
        log.info("Updating stock for productId: {} to {}", productId, newStock);
        String url = PRODUCT_SERVICE_URL + "/" + productId + "/stock";

        StockUpdateRequest request = new StockUpdateRequest(newStock);
        restTemplate.patchForObject(url, request, Void.class);
    }

    public void restoreStock(Long productId, int quantity) {
        log.info("Restoring stock for productId: {} by {}", productId, quantity);
        ProductInfo product = getProduct(productId);
        int newStock = product.getStockQuantity() + quantity;
        updateStock(productId, newStock);
    }

    public record StockUpdateRequest(Integer stockQuantity) {}
}