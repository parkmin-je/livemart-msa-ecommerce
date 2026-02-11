-- 성능 최적화를 위한 인덱스 추가
-- LiveMart Order Service

-- 사용자별 주문 조회 최적화 (가장 빈번한 쿼리)
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- 주문 상태별 검색 최적화
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- 날짜 범위 검색 최적화 (통계용)
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 주문 번호 검색 최적화 (Unique는 자동 인덱스지만 명시)
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- 복합 인덱스: 사용자 + 상태 (다중 조건 검색)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Order Items 테이블 최적화
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 결제 트랜잭션 ID 검색 최적화
CREATE INDEX idx_orders_payment_tx ON orders(payment_transaction_id);

-- 통계용 복합 인덱스
CREATE INDEX idx_orders_status_amount ON orders(status, total_amount);

-- 분석 쿼리: Covering Index (status, created_at, total_amount 동시 조회)
CREATE INDEX idx_orders_analytics ON orders(status, created_at, total_amount);
