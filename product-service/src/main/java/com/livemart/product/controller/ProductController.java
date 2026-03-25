package com.livemart.product.controller;

import com.livemart.product.dto.ProductCreateRequest;
import com.livemart.product.dto.ProductResponse;
import com.livemart.product.dto.ProductUpdateRequest;
import com.livemart.product.search.AdvancedSearchService;
import com.livemart.product.search.SearchCriteria;
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
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Arrays;

@Tag(name = "Product API", description = "상품 관리 API")
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final AdvancedSearchService advancedSearchService;

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
        return ResponseEntity.ok(productService.searchProducts(sanitizeSearchInput(keyword), pageable));
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

    // ── Elasticsearch 고급 검색 엔드포인트 ──────────────────────────────

    @Operation(summary = "퍼지 검색", description = "오타를 허용하는 Elasticsearch 퍼지 검색")
    @GetMapping("/search/fuzzy")
    public ResponseEntity<List<ProductResponse>> fuzzySearch(
            @Parameter(description = "검색 키워드") @RequestParam String keyword,
            @Parameter(description = "오타 허용 범위 (0~2)") @RequestParam(defaultValue = "1") int fuzziness) {
        return ResponseEntity.ok(advancedSearchService.fuzzySearch(sanitizeSearchInput(keyword), fuzziness));
    }

    @Operation(summary = "고급 필터 검색", description = "가격 범위, 카테고리, 재고 여부로 필터링하는 Elasticsearch 검색")
    @GetMapping("/search/advanced")
    public ResponseEntity<List<ProductResponse>> advancedSearch(
            @Parameter(description = "검색 키워드") @RequestParam(required = false) String keyword,
            @Parameter(description = "최소 가격") @RequestParam(required = false) BigDecimal minPrice,
            @Parameter(description = "최대 가격") @RequestParam(required = false) BigDecimal maxPrice,
            @Parameter(description = "카테고리 ID") @RequestParam(required = false) Long categoryId,
            @Parameter(description = "재고 있는 상품만") @RequestParam(defaultValue = "false") boolean inStockOnly,
            @Parameter(description = "정렬 기준 (price, stockQuantity)") @RequestParam(defaultValue = "_score") String sortBy,
            @Parameter(description = "페이지 번호") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size) {
        SearchCriteria criteria = SearchCriteria.builder()
                .keyword(keyword)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .categoryId(categoryId)
                .inStockOnly(inStockOnly)
                .sortBy(sortBy)
                .page(page)
                .size(size)
                .build();
        return ResponseEntity.ok(advancedSearchService.advancedSearch(criteria));
    }

    @Operation(summary = "검색어 자동완성", description = "prefix 기반 Elasticsearch 자동완성")
    @GetMapping("/search/autocomplete")
    public ResponseEntity<List<String>> autocomplete(
            @Parameter(description = "검색어 prefix") @RequestParam String prefix) {
        return ResponseEntity.ok(advancedSearchService.autocomplete(sanitizeSearchInput(prefix)));
    }

    // ── 보안 헬퍼 ───────────────────────────────────────────────────

    /**
     * Elasticsearch 쿼리 인젝션 방어 — 특수문자 이스케이프 및 길이 제한
     */
    private String sanitizeSearchInput(String input) {
        if (input == null) return null;
        // Elasticsearch 특수문자 이스케이프
        String[] specialChars = {"\\", "+", "-", "=", "&&", "||", ">", "<", "!", "(", ")", "{", "}", "[", "]", "^", "\"", "~", "*", "?", ":", "/"};
        for (String special : specialChars) {
            input = input.replace(special, "\\" + special);
        }
        // 최대 길이 제한
        if (input.length() > 100) {
            input = input.substring(0, 100);
        }
        return input.trim();
    }

    @Operation(summary = "유사 상품 추천", description = "특정 상품과 유사한 상품 목록 (More Like This)")
    @GetMapping("/{id}/related")
    public ResponseEntity<List<ProductResponse>> getRelatedProducts(
            @Parameter(description = "상품 ID") @PathVariable Long id,
            @Parameter(description = "추천 수") @RequestParam(defaultValue = "6") int size) {
        return ResponseEntity.ok(advancedSearchService.getRelatedProducts(id, size));
    }

    @Operation(summary = "검색 통계", description = "카테고리별 상품 수, 가격 통계 (Elasticsearch Aggregation)")
    @GetMapping("/search/aggregations")
    public ResponseEntity<Map<String, Object>> getAggregations() {
        return ResponseEntity.ok(advancedSearchService.getAggregations());
    }

    @Operation(summary = "ES 재인덱싱", description = "DB의 모든 상품을 Elasticsearch에 재인덱싱합니다 (관리자용)")
    @PostMapping("/search/reindex")
    public ResponseEntity<Map<String, Object>> reindex() {
        int count = productService.reindexAllProducts();
        return ResponseEntity.ok(Map.of("indexed", count, "message", "재인덱싱 완료"));
    }
}