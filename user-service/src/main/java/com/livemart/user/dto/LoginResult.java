package com.livemart.user.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 로그인 내부 처리 결과 (Controller에서 쿠키 설정 후 사용자 정보만 클라이언트에 반환)
 * accessToken / refreshToken은 httpOnly 쿠키로만 전달 — 응답 body에 포함 금지
 */
@Getter
@Builder
public class LoginResult {
    // 쿠키 설정용 (응답 body에 노출 금지)
    private String accessToken;
    private String refreshToken;
    private Long accessTokenExpiry;
    private Long refreshTokenExpiry;

    // 클라이언트 UI용 (비민감 정보)
    private Long userId;
    private String email;
    private String name;
    private String role;
}
