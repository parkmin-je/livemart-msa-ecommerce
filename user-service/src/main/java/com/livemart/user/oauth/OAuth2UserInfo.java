package com.livemart.user.oauth;

import java.util.Map;

/**
 * OAuth 2.0 사용자 정보 인터페이스
 */
public interface OAuth2UserInfo {
    String getProviderId();
    String getProvider();
    String getEmail();
    String getName();
    String getImageUrl();
    Map<String, Object> getAttributes();
}
