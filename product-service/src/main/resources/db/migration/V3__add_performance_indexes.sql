-- 성능 최적화를 위한 인덱스 추가
-- LiveMart Product Service

-- 카테고리별 상품 조회 (가장 빈번한 쿼리)
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status);

-- 가격 범위 검색 최적화
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- 재고 부족 상품 조회
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

-- 복합 인덱스: 카테고리 + 가격 (필터 검색)
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category_id, price);

-- 복합 인덱스: 상태 + 생성일 (정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);

-- Elasticsearch 동기화용 인덱스
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- 카테고리 계층 구조 최적화
CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);

-- Full-Text Search를 위한 인덱스 (PostgreSQL GIN)
CREATE INDEX IF NOT EXISTS idx_products_fulltext_name ON products USING GIN(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_fulltext_desc ON products USING GIN(to_tsvector('english', COALESCE(description, '')));

-- 통계용 Covering Index
CREATE INDEX IF NOT EXISTS idx_products_analytics ON products(category_id, status, price, stock_quantity);
