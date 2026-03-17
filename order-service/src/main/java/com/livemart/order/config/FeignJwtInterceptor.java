package com.livemart.order.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Feign 클라이언트 JWT 전달 인터셉터
 * order-service → payment-service / product-service 내부 호출 시
 * 현재 요청의 JWT 쿠키 또는 Authorization 헤더를 그대로 전달
 */
@Configuration
public class FeignJwtInterceptor {

    @Bean
    public RequestInterceptor jwtRequestInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate template) {
                ServletRequestAttributes attrs =
                        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs == null) return;

                HttpServletRequest request = attrs.getRequest();

                // 1. httpOnly 쿠키 전달 (access_token)
                if (request.getCookies() != null) {
                    for (Cookie cookie : request.getCookies()) {
                        if ("access_token".equals(cookie.getName())) {
                            template.header("Cookie", "access_token=" + cookie.getValue());
                            return;
                        }
                    }
                }

                // 2. Authorization Bearer 헤더 폴백
                String auth = request.getHeader("Authorization");
                if (auth != null && auth.startsWith("Bearer ")) {
                    template.header("Authorization", auth);
                }
            }
        };
    }
}
