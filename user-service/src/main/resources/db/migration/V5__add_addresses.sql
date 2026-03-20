-- 배송지 테이블 생성
CREATE TABLE IF NOT EXISTS addresses (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    alias           VARCHAR(50)  NOT NULL,
    recipient       VARCHAR(50)  NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    zip_code        VARCHAR(10)  NOT NULL,
    address         VARCHAR(200) NOT NULL,
    detail_address  VARCHAR(100),
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_address_user ON addresses (user_id);
