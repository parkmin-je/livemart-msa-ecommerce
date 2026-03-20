package com.livemart.ai.tools;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * LiveMart AI Tool Calling 정의
 *
 * OpenAI Function Calling / Spring AI Tool Calling 패턴 구현체.
 * 실제 Tool Calling 흐름:
 *   User → ChatClient → GPT-4o-mini → Tool 선택 → Tool 실행 → 최종 응답
 *
 * [Spring AI 연동 방법]
 * Spring AI 1.0.0 의존성 추가 후 @Bean + @Description 방식으로 전환:
 *   @Bean @Description("주문 상태 조회") Function<OrderStatusRequest, String> getOrderStatus() {...}
 *
 * 현재: 직접 호출 방식 (OpenAI function_call 없이 tool 결과를 context에 삽입)
 */
@Slf4j
@Component
public class LivemartTools {

    /**
     * 주문번호로 배송 상태 조회
     * 실제 환경: order-service gRPC 호출
     */
    public String getOrderStatus(String orderNumber) {
        log.info("[Tool] getOrderStatus: orderNumber={}", orderNumber);
        if (orderNumber == null || orderNumber.isBlank()) {
            return "{\"error\": \"주문번호를 입력해 주세요.\"}";
        }
        int lastDigit = Character.getNumericValue(orderNumber.charAt(orderNumber.length() - 1));
        return switch (lastDigit % 4) {
            case 0 -> """
                    {"orderNumber":"%s","status":"SHIPPING","deliveryCompany":"CJ대한통운",
                    "trackingNumber":"1234567890123","currentLocation":"서울 강남구 허브",
                    "estimatedDelivery":"오늘 오후 6시~9시"}
                    """.formatted(orderNumber);
            case 1 -> """
                    {"orderNumber":"%s","status":"DELIVERED","deliveredAt":"어제 오후 3시 22분",
                    "message":"현관 문 앞에 놓아두었습니다."}
                    """.formatted(orderNumber);
            case 2 -> """
                    {"orderNumber":"%s","status":"PREPARING","message":"내일 오전 출고 예정입니다."}
                    """.formatted(orderNumber);
            default -> """
                    {"orderNumber":"%s","status":"PAYMENT_CONFIRMED","message":"1~2 영업일 내 발송 예정입니다."}
                    """.formatted(orderNumber);
        };
    }

    /**
     * 키워드로 상품 검색
     * 실제 환경: product-service Elasticsearch 검색
     */
    public String searchProducts(String keyword, String category, Integer maxPrice) {
        log.info("[Tool] searchProducts: keyword={}, category={}, maxPrice={}", keyword, category, maxPrice);
        return """
                {"keyword":"%s","totalCount":3,"products":[
                  {"id":1001,"name":"%s 프리미엄 에디션","price":89000,"rating":4.8,"reviewCount":2341,"stock":"재고 있음","badge":"베스트셀러"},
                  {"id":1002,"name":"%s 기본형","price":45000,"rating":4.5,"reviewCount":987,"stock":"재고 있음"},
                  {"id":1003,"name":"%s 스페셜 세트","price":129000,"rating":4.9,"reviewCount":456,"stock":"한정 수량"}
                ]}
                """.formatted(keyword, keyword, keyword, keyword);
    }

    /**
     * 카테고리별 반품/환불 정책 조회
     */
    public String getReturnPolicy(String category) {
        log.info("[Tool] getReturnPolicy: category={}", category);
        String cat = category != null ? category.toLowerCase() : "general";
        return switch (cat) {
            case "food", "식품" -> """
                    {"category":"식품","returnPeriod":"수령 후 24시간 이내","note":"단순 변심 반품 불가 (식품법)"}
                    """;
            case "electronics", "전자" -> """
                    {"category":"전자제품","returnPeriod":"수령 후 7일 이내","refundPeriod":"회수 후 3일 이내"}
                    """;
            default -> """
                    {"category":"일반","returnPeriod":"수령 후 7일 이내","refundPeriod":"회수 후 3~5일 이내","contact":"1588-0000"}
                    """;
        };
    }

    /**
     * 주문번호 패턴 감지 (LM-XXXXXXXX 형식)
     */
    public boolean containsOrderNumber(String message) {
        return message != null && (
            message.toUpperCase().matches(".*LM-\\d{6,}.*") ||
            message.matches(".*[A-Z]{2,3}-\\d{6,}.*")
        );
    }

    /**
     * 메시지에서 주문번호 추출
     */
    public String extractOrderNumber(String message) {
        if (message == null) return null;
        String upper = message.toUpperCase();
        int lmIdx = upper.indexOf("LM-");
        if (lmIdx >= 0) {
            int end = lmIdx;
            while (end < message.length() && (Character.isLetterOrDigit(message.charAt(end)) || message.charAt(end) == '-')) {
                end++;
            }
            return message.substring(lmIdx, end);
        }
        return null;
    }
}
