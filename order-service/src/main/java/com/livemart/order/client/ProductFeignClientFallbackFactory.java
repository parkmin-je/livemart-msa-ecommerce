package com.livemart.order.client;

import com.livemart.order.dto.ProductInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
public class ProductFeignClientFallbackFactory implements FallbackFactory<ProductFeignClient> {

    @Override
    public ProductFeignClient create(Throwable cause) {
        return new ProductFeignClient() {
            @Override
            public ProductInfo getProduct(Long productId) {
                log.error("Product Service 호출 실패 (getProduct): productId={}", productId, cause);
                throw new RuntimeException("상품 서비스가 일시적으로 이용 불가합니다.");
            }

            @Override
            public ProductInfo getProductWithLock(Long productId) {
                log.error("Product Service 호출 실패 (getProductWithLock): productId={}", productId, cause);
                throw new RuntimeException("상품 서비스가 일시적으로 이용 불가합니다.");
            }

            @Override
            public void updateStock(Long productId, Map<String, Integer> body) {
                log.error("Product Service 호출 실패 (updateStock): productId={}", productId, cause);
                throw new RuntimeException("재고 업데이트가 실패했습니다.");
            }
        };
    }
}
