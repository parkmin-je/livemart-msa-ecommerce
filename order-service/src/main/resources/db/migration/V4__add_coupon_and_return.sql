-- 쿠폰 테이블
CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    minimum_order_amount DECIMAL(10, 2),
    maximum_discount_amount DECIMAL(10, 2),
    total_quantity INTEGER NOT NULL,
    used_quantity INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupon_code ON coupons(code);
CREATE INDEX idx_coupon_active ON coupons(active);

-- 쿠폰 사용 내역 테이블
CREATE TABLE IF NOT EXISTS coupon_usages (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT NOT NULL REFERENCES coupons(id),
    user_id BIGINT NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_coupon_user UNIQUE (coupon_id, user_id)
);

CREATE INDEX idx_usage_user ON coupon_usages(user_id);
CREATE INDEX idx_usage_coupon ON coupon_usages(coupon_id);
CREATE INDEX idx_usage_order ON coupon_usages(order_number);

-- 반품/환불 요청 테이블
CREATE TABLE IF NOT EXISTS return_requests (
    id BIGSERIAL PRIMARY KEY,
    return_number VARCHAR(50) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    user_id BIGINT NOT NULL,
    return_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(30) NOT NULL,
    reason_detail VARCHAR(1000),
    refund_amount DECIMAL(10, 2),
    image_urls VARCHAR(500),
    admin_note TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_return_order ON return_requests(order_id);
CREATE INDEX idx_return_user ON return_requests(user_id);
CREATE INDEX idx_return_status ON return_requests(status);
