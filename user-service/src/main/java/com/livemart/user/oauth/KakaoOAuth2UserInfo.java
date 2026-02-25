package com.livemart.user.oauth;

import java.util.Map;

/**
 * Kakao OAuth 2.0 사용자 정보
 */
public class KakaoOAuth2UserInfo implements OAuth2UserInfo {

    private final Map<String, Object> attributes;

    public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    @Override
    public String getProviderId() {
        return String.valueOf(attributes.get("id"));
    }

    @Override
    public String getProvider() {
        return "kakao";
    }

    @Override
    public String getEmail() {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        if (kakaoAccount != null) {
            String email = (String) kakaoAccount.get("email");
            if (email != null && !email.isEmpty()) return email;
        }
        // 이메일 권한 없는 경우 providerId로 고유 이메일 생성
        return "kakao_" + getProviderId() + "@kakao.local";
    }

    @Override
    public String getName() {
        Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
        if (properties == null) {
            return null;
        }
        return (String) properties.get("nickname");
    }

    @Override
    public String getImageUrl() {
        Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
        if (properties == null) {
            return null;
        }
        return (String) properties.get("profile_image");
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }
}
