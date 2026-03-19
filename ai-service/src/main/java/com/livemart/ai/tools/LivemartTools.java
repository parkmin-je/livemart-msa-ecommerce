package com.livemart.ai.tools;

import com.fasterxml.jackson.annotation.JsonClassDescription;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Spring AI Tool Calling 정의
 *
 * 실제 프로덕션에서는 order-service / product-service gRPC/Feign 호출로 대체.
 * 현재는 현실적인 데모 응답을 반환하여 Tool Calling 흐름을 검증.
 *
 * ChatClient 설정 시 .defaultFunctions("getOrderStatus", "searchProducts", "getReturnPolicy")
 * 또는 요청 시 .functions("getOrderStatus", ...) 로 바인딩.
 */
@Slf4j
@Configuration
public class LivemartTools {

    // ─── Tool 1: 주문 상태 조회 ────────────────────────────────────────────────

    @JsonClassDescription("주문 상태 조회 요청")
    public record OrderStatusRequest(
            @JsonProperty(required = true)
            @JsonPropertyDescription("조회할 주문번호 (예: LM-20240315-001234)")
            String orderNumber
    ) {}

    @Bean
    @Description("주문번호로 현재 배송 상태와 예상 도착일을 조회합니다. 고객이 주문번호를 언급할 때 반드시 호출하세요.")
    public Function<OrderStatusRequest, String> getOrderStatus() {
        return req -> {
            log.info("[Tool] getOrderStatus called: orderNumber={}", req.orderNumber());

            // 실제 환경: order-service gRPC 호출
            // OrderStatusGrpc.OrderStatusBlockingStub stub = ...;
            // return stub.getOrderStatus(req).toString();

            // 데모: 현실적인 배송 상태 반환
            String orderNum = req.orderNumber();
            if (orderNum == null || orderNum.isBlank()) {
                return "{'error': '주문번호를 입력해 주세요.'}";
            }
            // 주문번호 마지막 자리에 따라 다른 상태 시뮬레이션
            int lastDigit = Character.getNumericValue(orderNum.charAt(orderNum.length() - 1));
            return switch (lastDigit % 4) {
                case 0 -> """
                        {"orderNumber":"%s","status":"SHIPPING","deliveryCompany":"CJ대한통운",
                        "trackingNumber":"1234567890123","currentLocation":"서울 강남구 허브",
                        "estimatedDelivery":"오늘 오후 6시~9시","message":"배송 중입니다."}
                        """.formatted(orderNum);
                case 1 -> """
                        {"orderNumber":"%s","status":"DELIVERED","deliveryCompany":"쿠팡로지스틱스",
                        "deliveredAt":"어제 오후 3시 22분","message":"배송 완료되었습니다. 현관 문 앞에 놓아두었습니다."}
                        """.formatted(orderNum);
                case 2 -> """
                        {"orderNumber":"%s","status":"PREPARING","message":"상품을 준비 중입니다. 내일 오전 출고 예정입니다."}
                        """.formatted(orderNum);
                default -> """
                        {"orderNumber":"%s","status":"PAYMENT_CONFIRMED","message":"결제가 확인되었습니다. 1~2 영업일 내 발송 예정입니다."}
                        """.formatted(orderNum);
            };
        };
    }

    // ─── Tool 2: 상품 검색 ────────────────────────────────────────────────────

    @JsonClassDescription("상품 검색 요청")
    public record ProductSearchRequest(
            @JsonProperty(required = true)
            @JsonPropertyDescription("검색 키워드 (예: 아이폰 케이스, 무선 이어폰)")
            String keyword,

            @JsonPropertyDescription("카테고리 필터 (electronics, fashion, food, beauty, sports — 선택사항)")
            String category,

            @JsonPropertyDescription("최대 가격 필터 (원 단위 — 선택사항)")
            Integer maxPrice
    ) {}

    @Bean
    @Description("상품을 키워드, 카테고리, 가격으로 검색합니다. 고객이 상품을 찾을 때 호출하세요.")
    public Function<ProductSearchRequest, String> searchProducts() {
        return req -> {
            log.info("[Tool] searchProducts called: keyword={}, category={}, maxPrice={}", req.keyword(), req.category(), req.maxPrice());

            // 실제 환경: product-service Elasticsearch 검색 호출
            // ProductSearchResponse result = productSearchClient.search(req);

            // 데모: 현실적인 상품 목록 반환
            return """
                    {"keyword":"%s","totalCount":3,"products":[
                      {"id":1001,"name":"%s 프리미엄 에디션","price":89000,"rating":4.8,"reviewCount":2341,"stock":"재고 있음","badge":"베스트셀러"},
                      {"id":1002,"name":"%s 기본형 (화이트/블랙)","price":45000,"rating":4.5,"reviewCount":987,"stock":"재고 있음"},
                      {"id":1003,"name":"%s 스페셜 세트","price":129000,"rating":4.9,"reviewCount":456,"stock":"한정 수량 (3개 남음)","badge":"핫딜"}
                    ]}
                    """.formatted(req.keyword(), req.keyword(), req.keyword(), req.keyword());
        };
    }

    // ─── Tool 3: 반품/환불 정책 조회 ─────────────────────────────────────────

    @JsonClassDescription("반품 정책 조회 요청")
    public record ReturnPolicyRequest(
            @JsonPropertyDescription("상품 카테고리 (electronics, fashion, food, beauty — 선택사항)")
            String category
    ) {}

    @Bean
    @Description("카테고리별 반품/환불 정책을 조회합니다. 고객이 반품·환불 기간이나 조건을 물을 때 호출하세요.")
    public Function<ReturnPolicyRequest, String> getReturnPolicy() {
        return req -> {
            log.info("[Tool] getReturnPolicy called: category={}", req.category());

            String cat = req.category() != null ? req.category().toLowerCase() : "general";

            return switch (cat) {
                case "food", "식품" -> """
                        {"category":"식품","returnPeriod":"수령 후 24시간 이내","conditions":["변질·이물질 포함 시 즉시 교환 가능","단순 변심 반품 불가 (식품법)"],"refundPeriod":"반품 확인 후 영업일 1일 이내"}
                        """;
                case "electronics", "전자" -> """
                        {"category":"전자제품","returnPeriod":"수령 후 7일 이내","conditions":["미개봉 제품만 단순 변심 반품 가능","개봉 후 하자 시 30일 이내 교환/환불"],"refundPeriod":"반품 회수 후 영업일 3일 이내","note":"제조사 보증기간 중 하자는 AS 센터 이용 권장"}
                        """;
                case "fashion", "의류" -> """
                        {"category":"패션/의류","returnPeriod":"수령 후 7일 이내","conditions":["착용 흔적·세탁 후 반품 불가","택 제거 시 반품 불가"],"refundPeriod":"반품 회수 후 영업일 3~5일 이내"}
                        """;
                default -> """
                        {"category":"일반","returnPeriod":"수령 후 7일 이내","conditions":["단순 변심 반품 가능 (배송비 고객 부담)","상품 하자 시 배송비 무료"],"refundPeriod":"반품 회수 후 영업일 3~5일 이내","contactNumber":"1588-0000"}
                        """;
            };
        };
    }

    // ─── Tool 4: 쿠폰/포인트 잔액 조회 ──────────────────────────────────────

    @JsonClassDescription("쿠폰 및 포인트 조회 요청")
    public record CouponPointRequest(
            @JsonProperty(required = true)
            @JsonPropertyDescription("회원 ID")
            String userId
    ) {}

    @Bean
    @Description("회원의 사용 가능한 쿠폰 목록과 포인트 잔액을 조회합니다.")
    public Function<CouponPointRequest, String> getCouponAndPoints() {
        return req -> {
            log.info("[Tool] getCouponAndPoints called: userId={}", req.userId());
            // 실제 환경: user-service 쿠폰/포인트 API 호출
            return """
                    {"userId":"%s","points":12500,
                     "coupons":[
                       {"name":"신규 회원 10%% 할인","discountRate":10,"minOrderAmount":30000,"expiresAt":"2026-04-30"},
                       {"name":"봄맞이 특가 3000원","discountAmount":3000,"minOrderAmount":50000,"expiresAt":"2026-03-31"}
                     ]}
                    """.formatted(req.userId());
        };
    }

    // ─── Tool Functions List (ChatClient 주입용) ──────────────────────────────

    public static final List<String> ALL_FUNCTIONS = List.of(
            "getOrderStatus", "searchProducts", "getReturnPolicy", "getCouponAndPoints"
    );
}
