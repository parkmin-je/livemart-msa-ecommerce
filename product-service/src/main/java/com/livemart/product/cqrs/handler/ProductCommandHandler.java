package com.livemart.product.cqrs.handler;

import com.livemart.product.cqrs.command.ProductCommand;
import com.livemart.product.domain.Product;
import com.livemart.product.domain.ProductStatus;
import com.livemart.product.repository.CategoryRepository;
import com.livemart.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CQRS Pattern - Command Handler
 * 상품 변경 명령을 처리하는 핸들러
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductCommandHandler {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    @CacheEvict(value = "products", key = "#result.id")
    public Product handle(ProductCommand.CreateProduct command) {
        log.info("Creating product: name={}", command.getName());

        var category = categoryRepository.findById(command.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + command.getCategoryId()));

        var product = Product.builder()
                .name(command.getName())
                .description(command.getDescription())
                .price(command.getPrice())
                .stockQuantity(command.getStockQuantity())
                .category(category)
                .status(ProductStatus.ACTIVE)
                .build();

        return productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = "products", key = "#command.productId")
    public Product handle(ProductCommand.UpdateProduct command) {
        log.info("Updating product: productId={}", command.getProductId());

        var product = productRepository.findById(command.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + command.getProductId()));

        if (command.getName() != null) {
            product.updateName(command.getName());
        }
        if (command.getDescription() != null) {
            product.updateDescription(command.getDescription());
        }
        if (command.getPrice() != null) {
            product.updatePrice(command.getPrice());
        }

        return productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = "products", key = "#command.productId")
    public Product handle(ProductCommand.UpdateStock command) {
        log.info("Updating stock: productId={}, quantity={}, operation={}",
                command.getProductId(), command.getQuantity(), command.getOperation());

        var product = productRepository.findByIdWithLock(command.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + command.getProductId()));

        switch (command.getOperation()) {
            case INCREASE:
                product.increaseStock(command.getQuantity());
                break;
            case DECREASE:
                product.decreaseStock(command.getQuantity());
                break;
            case SET:
                product.updateStock(command.getQuantity());
                break;
        }

        return productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = "products", key = "#command.productId")
    public void handle(ProductCommand.DeleteProduct command) {
        log.info("Deleting product: productId={}", command.getProductId());

        var product = productRepository.findById(command.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + command.getProductId()));

        product.delete();
        productRepository.save(product);
    }
}
