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
        Optional<User> userOptional = userRepository.findByEmail(oAuth2UserInfo.getEmail());

        if (userOptional.isPresent()) {
            // 기존 사용자 업데이트
            User user = userOptional.get();
            user.updateProfile(
                oAuth2UserInfo.getName(),
                oAuth2UserInfo.getImageUrl()
            );
            return userRepository.save(user);
        } else {
            // 신규 사용자 생성
            User newUser = User.builder()
                .email(oAuth2UserInfo.getEmail())
                .username(oAuth2UserInfo.getName())
                .profileImage(oAuth2UserInfo.getImageUrl())
                .provider(oAuth2UserInfo.getProvider())
                .providerId(oAuth2UserInfo.getProviderId())
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();

            return userRepository.save(newUser);
        }
    }
}
