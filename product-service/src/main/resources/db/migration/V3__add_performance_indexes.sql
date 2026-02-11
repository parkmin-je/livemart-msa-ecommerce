-- 성능 최적화를 위한 인덱스 추가
-- LiveMart Product Service

-- 카테고리별 상품 조회 (가장 빈번한 쿼리)
CREATE INDEX idx_products_category_status ON products(category_id, status);

-- 가격 범위 검색 최적화
CREATE INDEX idx_products_price ON products(price);

-- 재고 부족 상품 조회
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- 상품명 검색 (LIKE 쿼리 최적화)
CREATE INDEX idx_products_name ON products(name);

-- Seller별 상품 조회
CREATE INDEX idx_products_seller ON products(seller_id);

-- 복합 인덱스: 카테고리 + 가격 (필터 검색)
CREATE INDEX idx_products_category_price ON products(category_id, price);

-- 복합 인덱스: 상태 + 생성일 (정렬 최적화)
CREATE INDEX idx_products_status_created ON products(status, created_at DESC);

-- Elasticsearch 동기화용 인덱스
CREATE INDEX idx_products_updated_at ON products(updated_at);

-- 카테고리 계층 구조 최적화
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_path ON categories(path);

-- Full-Text Search를 위한 인덱스 (MySQL 8.0+)
ALTER TABLE products ADD FULLTEXT INDEX idx_products_fulltext (name, description);

-- 통계용 Covering Index
CREATE INDEX idx_products_analytics ON products(category_id, status, price, stock_quantity);
