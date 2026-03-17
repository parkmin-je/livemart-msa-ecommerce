-- ============================================================
-- Analytics Service V1: 초기 스키마
-- 일별 매출 집계 + 이벤트 로그 + A/B 테스트 + Web Vitals
-- ============================================================

-- ── 일별 매출 집계 ─────────────────────────────────────────
CREATE TABLE daily_sales_records (
    id           BIGSERIAL    PRIMARY KEY,
    sales_date   DATE         NOT NULL UNIQUE,
    total_amount NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    order_count  INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_sales_date ON daily_sales_records (sales_date DESC);

-- ── 상품별 매출 집계 ───────────────────────────────────────
CREATE TABLE product_sales_summary (
    id              BIGSERIAL       PRIMARY KEY,
    product_id      BIGINT          NOT NULL,
    product_name    VARCHAR(255)    NOT NULL,
    category        VARCHAR(100),
    sales_date      DATE            NOT NULL,
    quantity_sold   INTEGER         NOT NULL DEFAULT 0,
    revenue         NUMERIC(19, 2)  NOT NULL DEFAULT 0.00,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, sales_date)
);

CREATE INDEX idx_product_sales_date       ON product_sales_summary (sales_date DESC);
CREATE INDEX idx_product_sales_product_id ON product_sales_summary (product_id);
CREATE INDEX idx_product_sales_category   ON product_sales_summary (category, sales_date DESC);

-- ── 페이지 뷰 이벤트 ───────────────────────────────────────
CREATE TABLE page_view_events (
    id           BIGSERIAL       PRIMARY KEY,
    session_id   VARCHAR(128)    NOT NULL,
    user_id      BIGINT,
    page_path    VARCHAR(512)    NOT NULL,
    referrer     VARCHAR(512),
    user_agent   TEXT,
    ip_address   INET,
    duration_ms  INTEGER,                     -- 체류 시간(ms)
    occurred_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_view_occurred_at ON page_view_events (occurred_at DESC);
CREATE INDEX idx_page_view_user_id     ON page_view_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_page_view_page_path   ON page_view_events (page_path, occurred_at DESC);

-- ── 상품 클릭 / 노출 이벤트 ────────────────────────────────
CREATE TABLE product_interaction_events (
    id              BIGSERIAL       PRIMARY KEY,
    event_type      VARCHAR(20)     NOT NULL CHECK (event_type IN ('VIEW', 'CLICK', 'CART_ADD', 'WISHLIST_ADD', 'PURCHASE')),
    session_id      VARCHAR(128)    NOT NULL,
    user_id         BIGINT,
    product_id      BIGINT          NOT NULL,
    product_name    VARCHAR(255),
    category        VARCHAR(100),
    price           NUMERIC(19, 2),
    quantity        INTEGER         DEFAULT 1,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_event_type       ON product_interaction_events (event_type, occurred_at DESC);
CREATE INDEX idx_product_event_product_id ON product_interaction_events (product_id, occurred_at DESC);
CREATE INDEX idx_product_event_user_id    ON product_interaction_events (user_id) WHERE user_id IS NOT NULL;

-- ── A/B 테스트 ─────────────────────────────────────────────
CREATE TABLE ab_tests (
    id              BIGSERIAL       PRIMARY KEY,
    test_key        VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    variants        JSONB           NOT NULL DEFAULT '{}',    -- {"A": 50, "B": 50} (weight)
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
    started_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE ab_test_assignments (
    id          BIGSERIAL       PRIMARY KEY,
    test_key    VARCHAR(100)    NOT NULL REFERENCES ab_tests(test_key) ON DELETE CASCADE,
    session_id  VARCHAR(128)    NOT NULL,
    user_id     BIGINT,
    variant     VARCHAR(10)     NOT NULL,
    assigned_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (test_key, session_id)
);

CREATE INDEX idx_ab_assignment_test_key ON ab_test_assignments (test_key, variant);
CREATE INDEX idx_ab_assignment_user_id  ON ab_test_assignments (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE ab_test_conversions (
    id              BIGSERIAL       PRIMARY KEY,
    test_key        VARCHAR(100)    NOT NULL,
    session_id      VARCHAR(128)    NOT NULL,
    user_id         BIGINT,
    variant         VARCHAR(10)     NOT NULL,
    conversion_type VARCHAR(50)     NOT NULL,   -- 'PURCHASE', 'SIGNUP', 'CLICK', etc.
    value           NUMERIC(19, 2),
    converted_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ab_conversion_test_key ON ab_test_conversions (test_key, variant, converted_at DESC);

-- ── Web Vitals (Core Web Vitals 수집) ─────────────────────
CREATE TABLE web_vitals (
    id          BIGSERIAL       PRIMARY KEY,
    session_id  VARCHAR(128)    NOT NULL,
    user_id     BIGINT,
    page_path   VARCHAR(512)    NOT NULL,
    metric_name VARCHAR(20)     NOT NULL CHECK (metric_name IN ('LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP')),
    metric_value NUMERIC(10, 3) NOT NULL,
    rating      VARCHAR(10)     CHECK (rating IN ('good', 'needs-improvement', 'poor')),
    device_type VARCHAR(20)     CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    occurred_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_web_vitals_metric    ON web_vitals (metric_name, occurred_at DESC);
CREATE INDEX idx_web_vitals_page_path ON web_vitals (page_path, metric_name, occurred_at DESC);

-- ── updated_at 자동 갱신 트리거 ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_daily_sales_updated_at
    BEFORE UPDATE ON daily_sales_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_product_sales_updated_at
    BEFORE UPDATE ON product_sales_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
