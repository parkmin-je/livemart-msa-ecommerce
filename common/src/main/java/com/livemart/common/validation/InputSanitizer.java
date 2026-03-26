package com.livemart.common.validation;

import java.util.regex.Pattern;

/**
 * 공통 입력값 검증 및 정제 유틸리티
 * <p>
 * XSS, SQL Injection, Elasticsearch 쿼리 인젝션 방어를 위한 공통 유틸리티.
 * 각 서비스에서 정적 메서드로 사용 가능.
 */
public final class InputSanitizer {

    private InputSanitizer() {}

    // HTML 태그 제거 패턴
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]*>");

    // 스크립트 관련 위험 패턴
    private static final Pattern SCRIPT_PATTERN = Pattern.compile(
        "(?i)(javascript:|vbscript:|on\\w+\\s*=|<script|</script)", Pattern.CASE_INSENSITIVE
    );

    // 이메일 검증 패턴
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
    );

    // 전화번호 검증 패턴 (한국)
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\d{2,3}-?\\d{3,4}-?\\d{4}$");

    // URL 검증 패턴
    private static final Pattern URL_PATTERN = Pattern.compile(
        "^https?://[a-zA-Z0-9.\\-/_%?=&#@:!+,;()$*~]+$"
    );

    // Elasticsearch 특수문자
    private static final String[] ES_SPECIAL_CHARS = {
        "\\", "+", "-", "=", "&&", "||", ">", "<", "!", "(", ")",
        "{", "}", "[", "]", "^", "\"", "~", "*", "?", ":", "/"
    };

    /**
     * HTML 태그 및 스크립트 제거 (XSS 방지)
     *
     * @param input 원본 입력값
     * @return HTML 태그가 제거된 문자열
     */
    public static String stripHtml(String input) {
        if (input == null) return null;
        String stripped = HTML_TAG_PATTERN.matcher(input).replaceAll("");
        stripped = SCRIPT_PATTERN.matcher(stripped).replaceAll("");
        return stripped;
    }

    /**
     * Elasticsearch 쿼리 인젝션 방어 — 특수문자 이스케이프 및 최대 길이 제한
     *
     * @param input  검색 키워드
     * @param maxLen 최대 길이 (기본 100)
     * @return 이스케이프된 검색어
     */
    public static String sanitizeElasticsearch(String input, int maxLen) {
        if (input == null) return null;
        for (String special : ES_SPECIAL_CHARS) {
            input = input.replace(special, "\\" + special);
        }
        if (input.length() > maxLen) {
            input = input.substring(0, maxLen);
        }
        return input.trim();
    }

    /**
     * 일반 텍스트 입력 정제 (XSS + 길이 제한)
     *
     * @param input  원본 입력값
     * @param maxLen 최대 길이
     * @return 정제된 문자열
     */
    public static String sanitize(String input, int maxLen) {
        if (input == null) return null;
        String result = stripHtml(input);
        if (result.length() > maxLen) {
            result = result.substring(0, maxLen);
        }
        return result.trim();
    }

    /**
     * 이메일 형식 검증
     *
     * @param email 검증할 이메일
     * @return 유효한 이메일 형식이면 true
     */
    public static boolean isValidEmail(String email) {
        if (email == null || email.isBlank()) return false;
        return EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    /**
     * 한국 전화번호 형식 검증
     *
     * @param phone 검증할 전화번호
     * @return 유효한 전화번호 형식이면 true
     */
    public static boolean isValidPhone(String phone) {
        if (phone == null || phone.isBlank()) return false;
        return PHONE_PATTERN.matcher(phone.replaceAll("\\s", "")).matches();
    }

    /**
     * URL 형식 검증 (http/https만 허용)
     *
     * @param url 검증할 URL
     * @return 유효한 URL이면 true
     */
    public static boolean isValidUrl(String url) {
        if (url == null || url.isBlank()) return false;
        return URL_PATTERN.matcher(url.trim()).matches();
    }
}
