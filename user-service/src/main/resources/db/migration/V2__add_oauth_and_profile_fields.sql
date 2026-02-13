-- Add OAuth and Profile fields

ALTER TABLE users
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS provider VARCHAR(20),
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(100);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

-- PostgreSQL에서는 COMMENT를 사용
COMMENT ON COLUMN users.username IS 'Username for login';
COMMENT ON COLUMN users.profile_image IS 'Profile image URL';
COMMENT ON COLUMN users.provider IS 'OAuth provider (google, kakao, naver)';
COMMENT ON COLUMN users.provider_id IS 'OAuth provider user ID';
