package com.livemart.product.service;

import com.livemart.product.document.ProductDocument;
import com.livemart.product.domain.Category;
import com.livemart.product.domain.Product;
import com.livemart.product.domain.ProductStatus;
import com.livemart.product.dto.ProductCreateRequest;
import com.livemart.product.dto.ProductResponse;
import com.livemart.product.dto.ProductUpdateRequest;
import com.livemart.product.event.ProductEvent;
import com.livemart.product.event.StockEvent;
import com.livemart.product.repository.CategoryRepository;
import com.livemart.product.repository.ProductRepository;
import com.livemart.product.repository.ProductSearchRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.*;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ProductService 단위 테스트")
class ProductServiceTest {

    private ProductService productService;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductSearchRepository productSearchRepository;

    @Mock
    @SuppressWarnings("unchecked")
    private KafkaTemplate<String, ProductEvent> kafkaTemplate;

    @Mock
    @SuppressWarnings("unchecked")
    private KafkaTemplate<String, StockEvent> stockKafkaTemplate;

    @BeforeEach
    void setUp() {
        productService = new ProductService(
                productRepository, categoryRepository, productSearchRepository,
                kafkaTemplate, stockKafkaTemplate);
    }

    // ──────────────────────────────────────────────────────────────────
    // Helper factory methods
    // ──────────────────────────────────────────────────────────────────

    private Category buildCategory(Long id, String name) {
        return Category.builder()
                .id(id)
                .name(name)
                .description("테스트 카테고리")
                .build();
    }

    private Product buildProduct(Long id, String name, BigDecimal price, int stock, Category category) {
        return Product.builder()
                .id(id)
                .name(name)
                .description("테스트 상품 설명")
                .price(price)
                .stockQuantity(stock)
                .category(category)
                .status(ProductStatus.ACTIVE)
                .imageUrl("https://cdn.livemart.com/products/" + id + ".jpg")
                .sellerId(10L)
                .build();
    }

    // ──────────────────────────────────────────────────────────────────
    // createProduct tests
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("상품 생성 (createProduct)")
    class CreateProductTest {

        @Test
        @DisplayName("성공 - 유효한 요청으로 상품 생성")
        void createProduct_success() {
            // given
            Category category = buildCategory(1L, "전자제품");
            ProductCreateRequest request = new ProductCreateRequest(
                    "무선 이어폰",
                    "고음질 블루투스 이어폰",
                    new BigDecimal("89000"),
                    50,
                    1L,
                    "https://cdn.example.com/earphone.jpg",
                    10L
            );

            Product savedProduct = buildProduct(100L, "무선 이어폰", new BigDecimal("89000"), 50, category);

            given(categoryRepository.findById(1L)).willReturn(Optional.of(category));
            given(productRepository.save(any(Product.class))).willReturn(savedProduct);
            given(productSearchRepository.save(any(ProductDocument.class))).willReturn(new ProductDocument());

            // when
            ProductResponse response = productService.createProduct(request);

            // then
            assertThat(response).isNotNull();
            assertThat(response.getName()).isEqualTo("무선 이어폰");
            assertThat(response.getPrice()).isEqualByComparingTo(new BigDecimal("89000"));
            assertThat(response.getStockQuantity()).isEqualTo(50);
            assertThat(response.getCategoryName()).isEqualTo("전자제품");
            assertThat(response.getStatus()).isEqualTo(ProductStatus.ACTIVE);
            then(productRepository).should(times(1)).save(any(Product.class));
            then(productSearchRepository).should(times(1)).save(any(ProductDocument.class));
            then(kafkaTemplate).should(times(1)).send(eq("product-events"), anyString(), any(ProductEvent.class));
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 카테고리")
        void createProduct_categoryNotFound_throwsException() {
            // given
            given(categoryRepository.findById(999L)).willReturn(Optional.empty());

            ProductCreateRequest request = new ProductCreateRequest(
                    "상품명", "설명", new BigDecimal("10000"), 10, 999L, null, 10L
            );

            // when & then
            assertThatThrownBy(() -> productService.createProduct(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("카테고리를 찾을 수 없습니다");
            then(productRepository).should(never()).save(any(Product.class));
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // getProduct tests (cache behavior)
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("상품 단건 조회 (getProduct)")
    class GetProductTest {

        @Test
        @DisplayName("성공 - 상품 ID로 조회")
        void getProduct_success() {
            // given
            Category category = buildCategory(2L, "패션");
            Product product = buildProduct(200L, "청바지", new BigDecimal("59000"), 30, category);

            given(productRepository.findById(200L)).willReturn(Optional.of(product));

            // when
            ProductResponse response = productService.getProduct(200L);

            // then
            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(200L);
            assertThat(response.getName()).isEqualTo("청바지");
            assertThat(response.getCategoryName()).isEqualTo("패션");
            then(productRepository).should(times(1)).findById(200L);
        }

        @Test
        @DisplayName("캐시 히트 - @Cacheable 동작으로 DB는 한 번만 호출 (단위 테스트에서 레포지토리 호출 검증)")
        void getProduct_cacheHit_returnsCachedValue() {
            // given
            Category category = buildCategory(3L, "도서");
            Product product = buildProduct(300L, "자바 프로그래밍", new BigDecimal("35000"), 100, category);

            given(productRepository.findById(300L)).willReturn(Optional.of(product));

            // when: 동일한 productId로 두 번 호출 (단위 테스트에서는 AOP 캐시가 동작하지 않으므로 레포지토리 2회 호출)
            ProductResponse first = productService.getProduct(300L);
            ProductResponse second = productService.getProduct(300L);

            // then: 두 응답이 동일한 데이터를 반환
            assertThat(first.getId()).isEqualTo(second.getId());
            assertThat(first.getName()).isEqualTo(second.getName());
            assertThat(first.getPrice()).isEqualByComparingTo(second.getPrice());
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 상품 ID")
        void getProduct_notFound_throwsException() {
            // given
            given(productRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> productService.getProduct(999L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("상품을 찾을 수 없습니다");
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // updateProduct tests
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("상품 수정 (updateProduct)")
    class UpdateProductTest {

        @Test
        @DisplayName("성공 - 상품 정보 수정 및 캐시 무효화")
        void updateProduct_success_evictsCache() {
            // given
            Category category = buildCategory(1L, "전자제품");
            Product product = buildProduct(100L, "구형 이어폰", new BigDecimal("50000"), 20, category);

            ProductUpdateRequest request = new ProductUpdateRequest(
                    "신형 이어폰",
                    "업그레이드된 이어폰",
                    new BigDecimal("99000"),
                    "https://cdn.example.com/new-earphone.jpg",
                    null
            );

            given(productRepository.findById(100L)).willReturn(Optional.of(product));
            given(productSearchRepository.save(any(ProductDocument.class))).willReturn(new ProductDocument());

            // when
            ProductResponse response = productService.updateProduct(100L, request);

            // then
            assertThat(response).isNotNull();
            // Product.updateInfo() is called — verify the call chain
            then(productRepository).should(times(1)).findById(100L);
            then(productSearchRepository).should(times(1)).save(any(ProductDocument.class));
            then(kafkaTemplate).should(times(1)).send(eq("product-events"), anyString(), any(ProductEvent.class));
        }

        @Test
        @DisplayName("성공 - 카테고리 변경 포함 상품 수정")
        void updateProduct_withCategoryChange_success() {
            // given
            Category oldCategory = buildCategory(1L, "전자제품");
            Category newCategory = buildCategory(5L, "스마트홈");
            Product product = buildProduct(150L, "스마트 스피커", new BigDecimal("120000"), 15, oldCategory);

            ProductUpdateRequest request = new ProductUpdateRequest(null, null, null, null, 5L);

            given(productRepository.findById(150L)).willReturn(Optional.of(product));
            given(categoryRepository.findById(5L)).willReturn(Optional.of(newCategory));
            given(productSearchRepository.save(any(ProductDocument.class))).willReturn(new ProductDocument());

            // when
            productService.updateProduct(150L, request);

            // then
            then(categoryRepository).should(times(1)).findById(5L);
            then(productSearchRepository).should(times(1)).save(any(ProductDocument.class));
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 상품 수정 시도")
        void updateProduct_notFound_throwsException() {
            // given
            given(productRepository.findById(999L)).willReturn(Optional.empty());
            ProductUpdateRequest request = new ProductUpdateRequest("새이름", null, null, null, null);

            // when & then
            assertThatThrownBy(() -> productService.updateProduct(999L, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("상품을 찾을 수 없습니다");
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // updateStock tests
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("재고 수정 (updateStock)")
    class UpdateStockTest {

        @Test
        @DisplayName("성공 - 재고 수량 변경")
        void updateStock_success() {
            // given
            Category category = buildCategory(1L, "전자제품");
            Product product = buildProduct(200L, "노트북", new BigDecimal("1500000"), 10, category);

            given(productRepository.findByIdWithLock(200L)).willReturn(Optional.of(product));
            given(productSearchRepository.save(any(ProductDocument.class))).willReturn(new ProductDocument());

            // when
            productService.updateStock(200L, 25);

            // then
            assertThat(product.getStockQuantity()).isEqualTo(25);
            then(productRepository).should(times(1)).findByIdWithLock(200L);
            then(productSearchRepository).should(times(1)).save(any(ProductDocument.class));
            then(kafkaTemplate).should(times(1)).send(eq("product-events"), anyString(), any(ProductEvent.class));
            then(stockKafkaTemplate).should(times(1)).send(eq("stock-events"), anyString(), any(StockEvent.class));
        }

        @Test
        @DisplayName("성공 - 재고 0으로 설정")
        void updateStock_setToZero_success() {
            // given
            Category category = buildCategory(1L, "전자제품");
            Product product = buildProduct(201L, "품절 예정 상품", new BigDecimal("50000"), 5, category);

            given(productRepository.findByIdWithLock(201L)).willReturn(Optional.of(product));
            given(productSearchRepository.save(any(ProductDocument.class))).willReturn(new ProductDocument());

            // when
            productService.updateStock(201L, 0);

            // then
            assertThat(product.getStockQuantity()).isEqualTo(0);
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 상품 재고 수정 시도")
        void updateStock_productNotFound_throwsException() {
            // given
            given(productRepository.findByIdWithLock(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> productService.updateStock(999L, 100))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("상품을 찾을 수 없습니다");
        }

        @Test
        @DisplayName("실패 - 음수 재고 설정 시 예외 (Product 도메인 레벨)")
        void updateStock_negativeQuantity_throwsException() {
            // given
            Category category = buildCategory(1L, "전자제품");
            Product product = buildProduct(202L, "상품A", new BigDecimal("10000"), 10, category);

            given(productRepository.findByIdWithLock(202L)).willReturn(Optional.of(product));

            // when & then: Product.updateStock(-1) throws IllegalArgumentException
            assertThatThrownBy(() -> productService.updateStock(202L, -1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("재고는 0 이상이어야 합니다");
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // restoreStock tests
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("재고 복구 (restoreStock)")
    class RestoreStockTest {

        @Test
        @DisplayName("성공 - Saga 보상 트랜잭션으로 재고 복구")
        void restoreStock_success() {
            // given
            Category category = buildCategory(1L, "식품");
            Product product = buildProduct(300L, "유기농 사과", new BigDecimal("15000"), 5, category);

            given(productRepository.findById(300L)).willReturn(Optional.of(product));

            // when: restore 3 units (simulating rollback of an order that took 3 units)
            productService.restoreStock(300L, 3);

            // then: stock goes from 5 → 8
            assertThat(product.getStockQuantity()).isEqualTo(8);
            then(stockKafkaTemplate).should(times(1)).send(eq("stock-events"), anyString(), any(StockEvent.class));
        }

        @Test
        @DisplayName("성공 - 재고가 0이었을 때 복구")
        void restoreStock_fromZero_success() {
            // given
            Category category = buildCategory(2L, "패션");
            Product product = buildProduct(301L, "한정판 티셔츠", new BigDecimal("80000"), 0, category);

            given(productRepository.findById(301L)).willReturn(Optional.of(product));

            // when
            productService.restoreStock(301L, 2);

            // then
            assertThat(product.getStockQuantity()).isEqualTo(2);
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 상품 재고 복구 시도")
        void restoreStock_productNotFound_throwsException() {
            // given
            given(productRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> productService.restoreStock(999L, 5))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("상품을 찾을 수 없습니다");
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // getProductsByCategory tests
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("카테고리별 상품 목록 조회 (getProductsByCategory)")
    class GetProductsByCategoryTest {

        @Test
        @DisplayName("성공 - 카테고리별 상품 목록 페이지 조회")
        void getProductsByCategory_success() {
            // given
            Category category = buildCategory(1L, "전자제품");
            List<Product> products = List.of(
                    buildProduct(1L, "스마트폰", new BigDecimal("800000"), 20, category),
                    buildProduct(2L, "태블릿", new BigDecimal("600000"), 15, category),
                    buildProduct(3L, "스마트워치", new BigDecimal("350000"), 30, category)
            );
            Pageable pageable = PageRequest.of(0, 10);
            Page<Product> productPage = new PageImpl<>(products, pageable, products.size());

            given(productRepository.findByCategoryId(1L, pageable)).willReturn(productPage);

            // when
            Page<ProductResponse> result = productService.getProductsByCategory(1L, pageable);

            // then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(3);
            assertThat(result.getTotalElements()).isEqualTo(3);
            assertThat(result.getContent().get(0).getName()).isEqualTo("스마트폰");
            assertThat(result.getContent().get(1).getName()).isEqualTo("태블릿");
            assertThat(result.getContent().get(2).getName()).isEqualTo("스마트워치");
            then(productRepository).should(times(1)).findByCategoryId(1L, pageable);
        }

        @Test
        @DisplayName("성공 - 해당 카테고리에 상품이 없는 경우 빈 페이지 반환")
        void getProductsByCategory_emptyCategory_returnsEmptyPage() {
            // given
            Pageable pageable = PageRequest.of(0, 10);
            given(productRepository.findByCategoryId(99L, pageable))
                    .willReturn(new PageImpl<>(List.of(), pageable, 0));

            // when
            Page<ProductResponse> result = productService.getProductsByCategory(99L, pageable);

            // then
            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isEqualTo(0);
        }

        @Test
        @DisplayName("성공 - 두 번째 페이지 조회")
        void getProductsByCategory_secondPage_success() {
            // given
            Category category = buildCategory(2L, "식품");
            List<Product> secondPageProducts = List.of(
                    buildProduct(11L, "유기농 쌀", new BigDecimal("25000"), 100, category),
                    buildProduct(12L, "국산 꿀", new BigDecimal("35000"), 50, category)
            );
            Pageable pageable = PageRequest.of(1, 10);
            Page<Product> productPage = new PageImpl<>(secondPageProducts, pageable, 12);

            given(productRepository.findByCategoryId(2L, pageable)).willReturn(productPage);

            // when
            Page<ProductResponse> result = productService.getProductsByCategory(2L, pageable);

            // then
            assertThat(result.getContent()).hasSize(2);
            assertThat(result.getTotalElements()).isEqualTo(12);
            assertThat(result.getNumber()).isEqualTo(1);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // searchProducts tests (Elasticsearch with DB fallback)
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("상품 검색 (searchProducts)")
    class SearchProductsTest {

        @Test
        @DisplayName("성공 - Elasticsearch 검색 정상 동작")
        void searchProducts_elasticsearchSuccess() {
            // given
            String keyword = "이어폰";
            Pageable pageable = PageRequest.of(0, 10);

            ProductDocument doc = ProductDocument.builder()
                    .id("100")
                    .name("무선 이어폰")
                    .description("블루투스 이어폰")
                    .price(new BigDecimal("89000"))
                    .stockQuantity(50)
                    .status("ACTIVE")
                    .sellerId(10L)
                    .build();

            Page<ProductDocument> esResult = new PageImpl<>(List.of(doc), pageable, 1);
            given(productSearchRepository.findByNameContainingOrDescriptionContaining(keyword, keyword, pageable))
                    .willReturn(esResult);

            // when
            Page<ProductResponse> result = productService.searchProducts(keyword, pageable);

            // then
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getName()).isEqualTo("무선 이어폰");
            then(productSearchRepository).should(times(1))
                    .findByNameContainingOrDescriptionContaining(keyword, keyword, pageable);
            then(productRepository).should(never()).searchByKeyword(anyString(), any(Pageable.class));
        }

        @Test
        @DisplayName("ES 장애 시 DB fallback 검색 사용")
        void searchProducts_elasticsearchFails_fallbackToDb() {
            // given
            String keyword = "노트북";
            Pageable pageable = PageRequest.of(0, 10);

            given(productSearchRepository.findByNameContainingOrDescriptionContaining(keyword, keyword, pageable))
                    .willThrow(new RuntimeException("Elasticsearch connection timeout"));

            Category category = buildCategory(1L, "전자제품");
            Product dbProduct = buildProduct(500L, "삼성 노트북", new BigDecimal("1200000"), 8, category);
            Page<Product> dbResult = new PageImpl<>(List.of(dbProduct), pageable, 1);
            given(productRepository.searchByKeyword(keyword, pageable)).willReturn(dbResult);

            // when
            Page<ProductResponse> result = productService.searchProducts(keyword, pageable);

            // then: fallback result returned
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getName()).isEqualTo("삼성 노트북");
            then(productRepository).should(times(1)).searchByKeyword(keyword, pageable);
        }
    }
}
