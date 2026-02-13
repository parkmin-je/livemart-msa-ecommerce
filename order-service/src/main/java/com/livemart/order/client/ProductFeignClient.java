package com.livemart.order.client;

import com.livemart.order.dto.ProductInfo;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@FeignClient(name = "PRODUCT-SERVICE", fallbackFactory = ProductFeignClientFallbackFactory.class)
public interface ProductFeignClient {

    @GetMapping("/api/products/{productId}")
    ProductInfo getProduct(@PathVariable("productId") Long productId);

    @GetMapping("/api/products/{productId}/with-lock")
    ProductInfo getProductWithLock(@PathVariable("productId") Long productId);

    @PutMapping("/api/products/{productId}/stock")
    void updateStock(@PathVariable("productId") Long productId, @RequestParam("stockQuantity") Integer stockQuantity);
}