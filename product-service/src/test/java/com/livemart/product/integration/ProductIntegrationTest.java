package com.livemart.product.integration;

import com.livemart.product.domain.Category;
import com.livemart.product.domain.Product;
import com.livemart.product.domain.ProductStatus;
import com.livemart.product.repository.CategoryRepository;
import com.livemart.product.repository.ProductRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testcontainers 기반 Product 통합 테스트
 * 실제 MySQL 컨테이너를 사용한 Repository 계층 검증
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("productdb_test")
            .withUsername("test")
            .withPassword("test123")
            .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        registry.add("eureka.client.enabled", () -> "false");
        registry.add("spring.data.redis.host", () -> "localhost");
        registry.add("spring.data.redis.port", () -> "6379");
        registry.add("spring.elasticsearch.uris", () -> "http://localhost:9200");
    }

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Category createTestCategory(String name) {
        Category category = Category.builder()
                .name(name)
                .description(name + " 카테고리")
                .createdAt(LocalDateTime.now())
                .build();
        return categoryRepository.save(category);
    }

    private Product createTestProduct(String name, BigDecimal price, int stock, Category category) {
        Product product = Product.builder()
                .name(name)
                .description(name + " 설명")
                .price(price)
                .stockQuantity(stock)
                .category(category)
                .status(ProductStatus.ACTIVE)
                .sellerId(1L)
                .imageUrl("https://example.com/images/" + name + ".jpg")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return productRepository.save(product);
    }

    @Nested
    @DisplayName("상품 저장 및 조회 테스트")
    class SaveAndFindTests {

        @Test
        @DisplayName("상품을 저장하고 ID로 조회할 수 있다")
        void saveAndFindById() {
            // given
            Category category = createTestCategory("전자제품-test1");
            Product product = createTestProduct("맥북 프로 16", new BigDecimal("3990000"), 50, category);

            // when
            Optional<Product> found = productRepository.findById(product.getId());

            // then
            assertThat(found).isPresent();
            assertThat(found.get().getName()).isEqualTo("맥북 프로 16");
            assertThat(found.get().getPrice()).isEqualByComparingTo(new BigDecimal("3990000"));
            assertThat(found.get().getStockQuantity()).isEqualTo(50);
            assertThat(found.get().getStatus()).isEqualTo(ProductStatus.ACTIVE);
        }

        @Test
        @DisplayName("카테고리와 함께 상품을 Fetch Join으로 조회할 수 있다")
        void findByIdWithCategory() {
            // given
            Category category = createTestCategory("의류-test1");
            Product product = createTestProduct("나이키 에어맥스", new BigDecimal("199000"), 100, category);

            // when
            Optional<Product> found = productRepository.findByIdWithCategory(product.getId());

            // then
            assertThat(found).isPresent();
            assertThat(found.get().getCategory()).isNotNull();
            assertThat(found.get().getCategory().getName()).isEqualTo("의류-test1");
        }
    }

    @Nested
    @DisplayName("카테고리별 상품 조회 테스트")
    class CategorySearchTests {

        @Test
        @DisplayName("카테고리 ID로 상품을 페이징 조회할 수 있다")
        void findByCategoryId() {
            // given
            Category electronics = createTestCategory("전자제품-cat");
            Category clothing = createTestCategory("의류-cat");

            createTestProduct("아이패드", new BigDecimal("1290000"), 30, electronics);
            createTestProduct("에어팟", new BigDecimal("359000"), 200, electronics);
            createTestProduct("티셔츠", new BigDecimal("39000"), 500, clothing);

            // when
            Page<Product> electronicsPage = productRepository.findByCategoryId(
                    electronics.getId(), PageRequest.of(0, 10));

            // then
            assertThat(electronicsPage.getContent()).hasSize(2);
            assertThat(electronicsPage.getContent()).allMatch(
                    p -> p.getCategory().getId().equals(electronics.getId()));
        }
    }

    @Nested
    @DisplayName("판매자별 상품 조회 테스트")
    class SellerSearchTests {

        @Test
        @DisplayName("판매자 ID로 상품을 조회할 수 있다")
        void findBySellerId() {
            // given
            Category category = createTestCategory("식품-seller");
            Product product = Product.builder()
                    .name("유기농 사과")
                    .description("맛있는 사과")
                    .price(new BigDecimal("29000"))
                    .stockQuantity(1000)
                    .category(category)
                    .status(ProductStatus.ACTIVE)
                    .sellerId(999L)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            productRepository.save(product);

            // when
            Page<Product> sellerProducts = productRepository.findBySellerId(
                    999L, PageRequest.of(0, 10));

            // then
            assertThat(sellerProducts.getContent()).hasSize(1);
            assertThat(sellerProducts.getContent().get(0).getSellerId()).isEqualTo(999L);
        }
    }

    @Nested
    @DisplayName("키워드 검색 테스트")
    class KeywordSearchTests {

        @Test
        @DisplayName("키워드로 상품을 검색할 수 있다")
        void searchByKeyword() {
            // given
            Category category = createTestCategory("전자제품-kw");
            createTestProduct("삼성 갤럭시 S24", new BigDecimal("1350000"), 80, category);
            createTestProduct("삼성 갤럭시 버즈", new BigDecimal("199000"), 150, category);
            createTestProduct("애플 아이폰 15", new BigDecimal("1250000"), 60, category);

            // when
            Page<Product> result = productRepository.searchByKeyword("갤럭시", PageRequest.of(0, 10));

            // then
            assertThat(result.getContent()).hasSize(2);
            assertThat(result.getContent()).allMatch(p -> p.getName().contains("갤럭시"));
        }
    }

    @Nested
    @DisplayName("재고 관리 테스트")
    class StockManagementTests {

        @Test
        @DisplayName("재고를 차감할 수 있다")
        void decreaseStock() {
            // given
            Category category = createTestCategory("재고테스트");
            Product product = createTestProduct("재고 테스트 상품", new BigDecimal("10000"), 100, category);

            // when
            product.decreaseStock(30);
            Product saved = productRepository.save(product);

            // then
            assertThat(saved.getStockQuantity()).isEqualTo(70);
        }

        @Test
        @DisplayName("재고를 증가시킬 수 있다")
        void increaseStock() {
            // given
            Category category = createTestCategory("재고증가테스트");
            Product product = createTestProduct("재고 증가 상품", new BigDecimal("10000"), 50, category);

            // when
            product.increaseStock(20);
            Product saved = productRepository.save(product);

            // then
            assertThat(saved.getStockQuantity()).isEqualTo(70);
        }

        @Test
        @DisplayName("비관적 락으로 상품을 조회할 수 있다")
        void findByIdWithLock() {
            // given
            Category category = createTestCategory("락테스트");
            Product product = createTestProduct("락 테스트 상품", new BigDecimal("25000"), 10, category);

            // when
            Optional<Product> locked = productRepository.findByIdWithLock(product.getId());

            // then
            assertThat(locked).isPresent();
            assertThat(locked.get().getId()).isEqualTo(product.getId());
        }

        @Test
        @DisplayName("상품 정보를 수정할 수 있다")
        void updateProductInfo() {
            // given
            Category category = createTestCategory("수정테스트");
            Product product = createTestProduct("수정 전 상품", new BigDecimal("10000"), 10, category);

            // when
            product.updateInfo("수정 후 상품", "새로운 설명", new BigDecimal("15000"), "https://new-image.jpg");
            Product saved = productRepository.save(product);

            // then
            assertThat(saved.getName()).isEqualTo("수정 후 상품");
            assertThat(saved.getDescription()).isEqualTo("새로운 설명");
            assertThat(saved.getPrice()).isEqualByComparingTo(new BigDecimal("15000"));
        }
    }
}
