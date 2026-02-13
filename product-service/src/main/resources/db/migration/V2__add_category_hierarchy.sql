-- 카테고리 계층 구조 지원을 위한 컬럼 추가
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS path VARCHAR(500);

ALTER TABLE categories ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

COMMENT ON COLUMN categories.parent_id IS '상위 카테고리 ID';
COMMENT ON COLUMN categories.level IS '카테고리 계층 레벨';
COMMENT ON COLUMN categories.path IS '카테고리 경로';
