package com.livemart.product.controller;

import com.livemart.product.dto.ProductCreateRequest;
import com.livemart.product.dto.ProductResponse;
import com.livemart.product.dto.ProductUpdateRequest;
import com.livemart.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@Tag(name = "Product API", description = "상품 관리 API")
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @Operation(summary = "상품 등록", description = "새로운 상품을 등록합니다")
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductCreateRequest request) {
        return ResponseEntity.ok(productService.createProduct(request));
    }

    @Operation(summary = "상품 조회", description = "상품 ID로 상품을 조회합니다")
    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProduct(@Parameter(description = "상품 ID") @PathVariable Long id) {
        return ResponseEntity.ok(productService.getProduct(id));
    }

    @Operation(summary = "상품 조회 (락)", description = "비관적 락을 사용하여 상품을 조회합니다 (주문 시 사용)")
    @GetMapping("/{id}/with-lock")
    public ResponseEntity<ProductResponse> getProductWithLock(@Parameter(description = "상품 ID") @PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductWithLock(id));
    }

    @Operation(summary = "상품 목록 조회", description = "전체 상품 목록을 페이징하여 조회합니다")
    @GetMapping
    public ResponseEntity<Page<ProductResponse>> getProducts(Pageable pageable) {
        return ResponseEntity.ok(productService.getProducts(pageable));
    }

    @Operation(summary = "카테고리별 상품 조회", description = "카테고리 ID로 상품 목록을 조회합니다")
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Page<ProductResponse>> getProductsByCategory(
            @Parameter(description = "카테고리 ID") @PathVariable Long categoryId,
            Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId, pageable));
    }

    @Operation(summary = "판매자별 상품 조회", description = "판매자 ID로 상품 목록을 조회합니다")
    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<Page<ProductResponse>> getProductsBySeller(
            @Parameter(description = "판매자 ID") @PathVariable Long sellerId,
            Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsBySeller(sellerId, pageable));
    }

    @Operation(summary = "상품 검색", description = "키워드로 상품을 검색합니다")
    @GetMapping("/search")
    public ResponseEntity<Page<ProductResponse>> searchProducts(
            @Parameter(description = "검색 키워드") @RequestParam String keyword,
            Pageable pageable) {
        return ResponseEntity.ok(productService.searchProducts(keyword, pageable));
    }

    @Operation(summary = "상품 수정", description = "상품 정보를 수정합니다")
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @Parameter(description = "상품 ID") @PathVariable Long id,
            @Valid @RequestBody ProductUpdateRequest request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @Operation(summary = "상품 삭제", description = "상품을 삭제합니다")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@Parameter(description = "상품 ID") @PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "재고 수정", description = "상품 재고를 수정합니다")
    @PutMapping("/{id}/stock")
    public ResponseEntity<Void> updateStock(
            @Parameter(description = "상품 ID") @PathVariable Long id,
            @Parameter(description = "재고 수량") @RequestParam("stockQuantity") Integer stockQuantity) {
        productService.updateStock(id, stockQuantity);
        return ResponseEntity.ok().build();
    }
}