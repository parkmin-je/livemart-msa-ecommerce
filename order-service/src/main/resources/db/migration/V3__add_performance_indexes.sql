-- 성능 최적화를 위한 인덱스 추가
-- LiveMart Order Service

-- 사용자별 주문 조회 최적화 (가장 빈번한 쿼리)
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

-- 주문 상태별 검색 최적화
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- 복합 인덱스: 사용자 + 상태 (다중 조건 검색)
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

-- 결제 트랜잭션 ID 검색 최적화
CREATE INDEX IF NOT EXISTS idx_orders_payment_tx ON orders(payment_transaction_id);

-- 통계용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_status_amount ON orders(status, total_amount);

-- 분석 쿼리: Covering Index (status, created_at, total_amount 동시 조회)
CREATE INDEX IF NOT EXISTS idx_orders_analytics ON orders(status, created_at, total_amount);
