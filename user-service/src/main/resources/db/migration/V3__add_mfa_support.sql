-- Add MFA (Multi-Factor Authentication) support

ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS mfa_backup_codes VARCHAR(500);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);

-- PostgreSQL에서는 COMMENT를 사용
COMMENT ON COLUMN users.mfa_enabled IS 'MFA 활성화 여부';
COMMENT ON COLUMN users.mfa_secret_key IS 'TOTP Secret Key';
COMMENT ON COLUMN users.mfa_backup_codes IS '백업 코드 (쉼표로 구분)';
