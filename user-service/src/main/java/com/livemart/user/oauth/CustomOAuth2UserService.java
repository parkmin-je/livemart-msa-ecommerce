package com.livemart.user.oauth;

import com.livemart.user.domain.User;
import com.livemart.user.domain.UserRole;
import com.livemart.user.domain.UserStatus;
import com.livemart.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * OAuth 2.0 사용자 정보 처리 서비스
 * Google, Kakao, Naver 통합 로그인 지원
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        log.info("OAuth 2.0 login attempt: provider={}", registrationId);

        OAuth2UserInfo oAuth2UserInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(
            registrationId,
            oAuth2User.getAttributes()
        );

        if (oAuth2UserInfo.getEmail() == null || oAuth2UserInfo.getEmail().isEmpty()) {
            throw new OAuth2AuthenticationException("Email not found from OAuth2 provider");
        }

        User user = saveOrUpdateUser(oAuth2UserInfo);
        log.info("OAuth 2.0 login successful: userId={}, provider={}", user.getId(), registrationId);

        return new CustomOAuth2User(user, oAuth2User.getAttributes());
    }

    private User saveOrUpdateUser(OAuth2UserInfo oAuth2UserInfo) {
        // 1. provider + providerId로 먼저 조회 (가장 확실한 OAuth 식별자)
        Optional<User> byProvider = userRepository.findByProviderAndProviderId(
            oAuth2UserInfo.getProvider(), oAuth2UserInfo.getProviderId()
        );
        if (byProvider.isPresent()) {
            User user = byProvider.get();
            user.updateProfileImage(oAuth2UserInfo.getName(), oAuth2UserInfo.getImageUrl());
            log.info("OAuth 기존 사용자 업데이트: provider={}, providerId={}", oAuth2UserInfo.getProvider(), oAuth2UserInfo.getProviderId());
            return userRepository.save(user);
        }

        // 2. email로 조회 (일반 회원이 소셜 로그인 연동하는 경우)
        Optional<User> byEmail = userRepository.findByEmail(oAuth2UserInfo.getEmail());
        if (byEmail.isPresent()) {
            User user = byEmail.get();
            user.updateProfileImage(oAuth2UserInfo.getName(), oAuth2UserInfo.getImageUrl());
            log.info("OAuth 이메일 매칭 사용자 업데이트: email={}", oAuth2UserInfo.getEmail());
            return userRepository.save(user);
        }

        // 3. 신규 사용자 생성
        String displayName = oAuth2UserInfo.getName() != null && !oAuth2UserInfo.getName().isBlank()
            ? oAuth2UserInfo.getName()
            : oAuth2UserInfo.getEmail().split("@")[0];

        // username = "provider_providerId" 형태로 고유하게 생성 (displayName 중복 방지)
        String uniqueUsername = oAuth2UserInfo.getProvider() + "_" + oAuth2UserInfo.getProviderId();

        User newUser = User.builder()
            .email(oAuth2UserInfo.getEmail())
            .name(displayName)
            .username(uniqueUsername)
            .password("")           // OAuth 유저는 비밀번호 없음 (NOT NULL 컬럼 대응)
            .profileImage(oAuth2UserInfo.getImageUrl())
            .provider(oAuth2UserInfo.getProvider())
            .providerId(oAuth2UserInfo.getProviderId())
            .role(UserRole.USER)
            .status(UserStatus.ACTIVE)
            .build();

        log.info("OAuth 신규 사용자 생성: provider={}, email={}, username={}", oAuth2UserInfo.getProvider(), oAuth2UserInfo.getEmail(), uniqueUsername);
        return userRepository.save(newUser);
    }
}
