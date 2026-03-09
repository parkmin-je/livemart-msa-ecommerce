package com.livemart.user.oauth;

import com.livemart.user.domain.User;
import com.livemart.user.repository.UserRepository;
import com.livemart.user.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * OAuth2 로그인 성공 핸들러
 * JWT 토큰을 httpOnly 쿠키로 설정 후 비민감 정보만 URL 파라미터로 전달
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Value("${oauth2.redirect-uri:http://localhost:3000/auth/callback}")
    private String redirectUri;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // CustomOAuth2User에서 email 추출
        String email = null;
        if (oAuth2User instanceof CustomOAuth2User customUser) {
            email = customUser.getEmail();
        } else {
            email = (String) oAuth2User.getAttributes().get("email");
        }

        if (email == null) {
            log.error("OAuth2 login: email not found in principal");
            response.sendRedirect(redirectUri + "?error=email_not_found");
            return;
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.error("OAuth2 login: user not found for email={}", email);
            response.sendRedirect(redirectUri + "?error=user_not_found");
            return;
        }

        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        // 토큰을 httpOnly 쿠키로 설정 (URL 노출 금지)
        ResponseCookie accessCookie = ResponseCookie.from("access_token", accessToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMillis(jwtTokenProvider.getAccessTokenExpiration()))
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/api/users/refresh")
                .maxAge(Duration.ofMillis(jwtTokenProvider.getRefreshTokenExpiration()))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        // 휴대폰 번호가 없으면 온보딩 필요
        boolean needOnboarding = user.getPhoneNumber() == null || user.getPhoneNumber().isBlank();

        log.info("OAuth2 login success: userId={}, email={}, needOnboarding={}", user.getId(), email, needOnboarding);

        // 비민감 정보만 URL 파라미터로 전달 (토큰 제외)
        String redirectUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("userId", user.getId())
                .queryParam("name", URLEncoder.encode(user.getName(), StandardCharsets.UTF_8))
                .queryParam("role", user.getRole().name())
                .queryParam("needOnboarding", needOnboarding)
                .build().toUriString();

        response.sendRedirect(redirectUrl);
    }
}
