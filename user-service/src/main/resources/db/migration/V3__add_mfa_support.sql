-- Add MFA (Multi-Factor Authentication) support

ALTER TABLE users
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret_key VARCHAR(100),
ADD COLUMN mfa_backup_codes VARCHAR(500);

-- 인덱스 추가
CREATE INDEX idx_users_mfa_enabled ON users(mfa_enabled);

-- 주석 추가
ALTER TABLE users
MODIFY COLUMN mfa_enabled BOOLEAN DEFAULT FALSE COMMENT 'MFA 활성화 여부',
MODIFY COLUMN mfa_secret_key VARCHAR(100) COMMENT 'TOTP Secret Key',
MODIFY COLUMN mfa_backup_codes VARCHAR(500) COMMENT '백업 코드 (쉼표로 구분)';
