package com.livemart.user.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(unique = true, length = 50)
    private String username;

    @Column(length = 500)
    private String profileImage;

    @Column(length = 20)
    private String provider;  // google, kakao, naver

    @Column(length = 100)
    private String providerId;

    @Column(length = 20)
    private String phoneNumber;

    // MFA (Multi-Factor Authentication) 관련
    @Column(name = "mfa_enabled")
    private Boolean mfaEnabled = false;

    @Column(name = "mfa_secret_key", length = 100)
    private String mfaSecretKey;

    @Column(name = "mfa_backup_codes", length = 500)
    private String mfaBackupCodes;  // JSON 배열 형태로 저장

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public void updatePassword(String password) {
        this.password = password;
    }

    public void updateProfile(String name, String phoneNumber) {
        this.name = name;
        this.phoneNumber = phoneNumber;
    }

    public void updateProfile(String name, String profileImage) {
        if (name != null) {
            this.name = name;
        }
        if (profileImage != null) {
            this.profileImage = profileImage;
        }
    }

    public boolean isOAuthUser() {
        return provider != null && providerId != null;
    }

    public void enableMfa(String secretKey, java.util.List<String> backupCodes) {
        this.mfaEnabled = true;
        this.mfaSecretKey = secretKey;
        this.mfaBackupCodes = String.join(",", backupCodes);
    }

    public void disableMfa() {
        this.mfaEnabled = false;
        this.mfaSecretKey = null;
        this.mfaBackupCodes = null;
    }

    public java.util.Set<String> getBackupCodesSet() {
        if (mfaBackupCodes == null || mfaBackupCodes.isEmpty()) {
            return java.util.Collections.emptySet();
        }
        return new java.util.HashSet<>(java.util.Arrays.asList(mfaBackupCodes.split(",")));
    }

    public void consumeBackupCode(String code) {
        java.util.Set<String> codes = getBackupCodesSet();
        codes.remove(code);
        this.mfaBackupCodes = String.join(",", codes);
    }

    public boolean isMfaEnabled() {
        return mfaEnabled != null && mfaEnabled;
    }
}