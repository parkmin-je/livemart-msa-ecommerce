-- 카테고리 계층 구조 지원을 위한 컬럼 추가
ALTER TABLE categories ADD COLUMN parent_id BIGINT NULL;
ALTER TABLE categories ADD COLUMN level INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id);
ALTER TABLE categories ADD INDEX idx_categories_parent (parent_id);
