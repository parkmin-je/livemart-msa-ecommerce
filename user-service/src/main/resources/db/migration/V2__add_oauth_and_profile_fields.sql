-- Add OAuth and Profile fields

ALTER TABLE users
ADD COLUMN username VARCHAR(50) UNIQUE,
ADD COLUMN profile_image VARCHAR(500),
ADD COLUMN provider VARCHAR(20),
ADD COLUMN provider_id VARCHAR(100);

-- 인덱스 추가
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_provider ON users(provider, provider_id);

-- 주석 추가
ALTER TABLE users
MODIFY COLUMN username VARCHAR(50) COMMENT 'Username for login',
MODIFY COLUMN profile_image VARCHAR(500) COMMENT 'Profile image URL',
MODIFY COLUMN provider VARCHAR(20) COMMENT 'OAuth provider (google, kakao, naver)',
MODIFY COLUMN provider_id VARCHAR(100) COMMENT 'OAuth provider user ID';
