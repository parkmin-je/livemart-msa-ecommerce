CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL UNIQUE,
    order_number VARCHAR(50) NOT NULL,
    user_id BIGINT,
    amount DECIMAL(15,2) NOT NULL,
    refunded_amount DECIMAL(15,2),
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    approval_number VARCHAR(50),
    stripe_payment_intent_id VARCHAR(100),
    failure_reason VARCHAR(500),
    card_last4 VARCHAR(4),
    card_brand VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    version BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payment_events (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    topic VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INT DEFAULT 0
);

CREATE INDEX idx_payment_order ON payments(order_number);
CREATE INDEX idx_payment_transaction ON payments(transaction_id);
CREATE INDEX idx_payment_status ON payments(status);
CREATE INDEX idx_payment_user ON payments(user_id);
CREATE INDEX idx_pe_transaction ON payment_events(transaction_id);
CREATE INDEX idx_pe_created ON payment_events(created_at);
CREATE INDEX idx_outbox_status ON outbox_events(status);
