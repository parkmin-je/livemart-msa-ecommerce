package com.livemart.ai.controller;

import com.livemart.ai.dto.*;
import com.livemart.ai.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * AI 기능 REST API
 *
 * 기존 엔드포인트:
 *   POST /api/ai/recommend       — 개인화 상품 추천
 *   POST /api/ai/description     — 상품 설명 자동 생성
 *   POST /api/ai/chat            — CS 챗봇 (동기)
 *   POST /api/ai/chat/stream     — CS 챗봇 SSE 스트리밍
 *
 * 신규 엔드포인트:
 *   POST /api/ai/seller/agent    — 셀러 AI 에이전트 (Hunter Alpha)
 *   POST /api/ai/fraud/score     — 주문 사기 탐지
 *   POST /api/ai/review/sentiment — 리뷰 감성 분석 + 모더레이션
 *   POST /api/ai/user/churn      — 사용자 이탈 예측
 *   POST /api/ai/demand/forecast  — 수요 예측
 *   POST /api/ai/search/intent   — 검색 의도 분석
 *   POST /api/ai/pricing/dynamic — 동적 가격 추천
 *   POST /api/ai/inventory/replenishment — 스마트 재고 보충
 */
@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI", description = "AI 기반 추천/생성/챗봇/에이전트/사기탐지/감성분석/예측 API")
public class AiController {

    private final RecommendationService recommendationService;
    private final DescriptionGeneratorService descriptionGeneratorService;
    private final ChatbotService chatbotService;
    private final SellerAgentService sellerAgentService;
    private final FraudDetectionService fraudDetectionService;
    private final ReviewSentimentService reviewSentimentService;
    private final ChurnPredictionService churnPredictionService;
    private final DemandForecastService demandForecastService;
    private final SearchIntentService searchIntentService;
    private final DynamicPricingService dynamicPricingService;
    private final SmartReplenishmentService smartReplenishmentService;

    // ── 기존 엔드포인트 ────────────────────────────────────────────────

    @Operation(summary = "AI 상품 추천", description = "사용자 구매 이력 기반 개인화 추천. Redis 10분 캐싱.")
    @PostMapping("/recommend")
    public ResponseEntity<RecommendationResponse> recommend(
            @Valid @RequestBody RecommendationRequest request) {
        return ResponseEntity.ok(recommendationService.recommend(request));
    }

    @Operation(summary = "AI 상품 설명 생성", description = "판매자 도구: 상품명+키워드 → 한 줄 설명/본문/SEO 태그 자동 생성")
    @PostMapping("/description")
    public ResponseEntity<DescriptionResponse> generateDescription(
            @Valid @RequestBody DescriptionRequest request) {
        return ResponseEntity.ok(descriptionGeneratorService.generate(request));
    }

    @Operation(summary = "CS 챗봇", description = "고객 서비스 AI 챗봇. 주문 컨텍스트 포함 시 주문 상태 기반 답변.")
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(chatbotService.chat(request));
    }

    @Operation(summary = "CS 챗봇 스트리밍", description = "Server-Sent Events로 토큰 단위 실시간 스트리밍")
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chatStream(@Valid @RequestBody ChatRequest request) {
        return chatbotService.chatStream(request);
    }

    // ── 셀러 AI 에이전트 (Hunter Alpha) ─────────────────────────────────

    @Operation(
            summary = "셀러 AI 에이전트",
            description = "Hunter Alpha(MiMo-V2-Pro) 기반 멀티스텝 자율 에이전트. " +
                    "상품명+카테고리 입력 → 시장분석, 가격전략, 수요예측, 설명생성, 인사이트 자동 수행."
    )
    @PostMapping("/seller/agent")
    public ResponseEntity<SellerAgentResponse> runSellerAgent(
            @Valid @RequestBody SellerAgentRequest request) {
        log.info("Seller Agent request: product={}, category={}", request.getProductName(), request.getCategory());
        return ResponseEntity.ok(sellerAgentService.runAgent(request));
    }

    // ── 사기 탐지 ─────────────────────────────────────────────────────

    @Operation(
            summary = "주문 사기 탐지",
            description = "GPT-4o-mini 기반 실시간 주문 사기 위험도 스코어링 (0-100). " +
                    "HIGH/CRITICAL 시 REVIEW/BLOCK 액션 반환."
    )
    @PostMapping("/fraud/score")
    public ResponseEntity<FraudScoreResponse> scoreFraud(
            @RequestBody FraudScoreRequest request) {
        return ResponseEntity.ok(fraudDetectionService.score(request));
    }

    // ── 리뷰 감성 분석 ───────────────────────────────────────────────

    @Operation(
            summary = "리뷰 감성 분석 + 자동 모더레이션",
            description = "리뷰 텍스트 감성(POSITIVE/NEGATIVE/NEUTRAL) 분석, " +
                    "부적절 콘텐츠 자동 플래그/거절 처리, 품질/배송/가격 측면별 분석."
    )
    @PostMapping("/review/sentiment")
    public ResponseEntity<ReviewSentimentResponse> analyzeReview(
            @RequestBody ReviewSentimentRequest request) {
        return ResponseEntity.ok(reviewSentimentService.analyze(request));
    }

    // ── 이탈 예측 ────────────────────────────────────────────────────

    @Operation(
            summary = "사용자 이탈 예측",
            description = "Hunter Alpha 기반 행동 패턴 분석. " +
                    "이탈 위험도(0-100) + 맞춤 리텐션 액션(COUPON/RECOMMENDATION/EMAIL) 반환."
    )
    @PostMapping("/user/churn")
    public ResponseEntity<ChurnResponse> predictChurn(
            @RequestBody ChurnRequest request) {
        return ResponseEntity.ok(churnPredictionService.predict(request));
    }

    // ── 수요 예측 ────────────────────────────────────────────────────

    @Operation(
            summary = "상품 수요 예측",
            description = "Hunter Alpha 기반 시계열 수요 예측. " +
                    "주간/월간 예측량, 재주문 시점, 발주 수량, 트렌드(RISING/STABLE/DECLINING) 반환."
    )
    @PostMapping("/demand/forecast")
    public ResponseEntity<DemandForecastResponse> forecastDemand(
            @RequestBody DemandForecastRequest request) {
        return ResponseEntity.ok(demandForecastService.forecast(request));
    }

    // ── 검색 의도 분석 ───────────────────────────────────────────────

    @Operation(
            summary = "검색 의도 분석",
            description = "검색어 오타 수정, 의도 분류(CATEGORY/SPECIFIC_PRODUCT/PRICE_COMPARE/GENERAL), " +
                    "관련 키워드 확장. Redis 1시간 캐싱."
    )
    @PostMapping("/search/intent")
    public ResponseEntity<SearchIntentResponse> analyzeSearchIntent(
            @RequestBody SearchIntentRequest request) {
        return ResponseEntity.ok(searchIntentService.analyze(request));
    }

    // ── 동적 가격 추천 ───────────────────────────────────────────────

    @Operation(
            summary = "동적 가격 추천",
            description = "경쟁사 가격, 재고 수준, 판매 속도 기반 최적 가격 전략 추천. " +
                    "전략: PENETRATION/PREMIUM/COMPETITIVE/CLEARANCE."
    )
    @PostMapping("/pricing/dynamic")
    public ResponseEntity<DynamicPricingResponse> recommendPrice(
            @RequestBody DynamicPricingRequest request) {
        return ResponseEntity.ok(dynamicPricingService.recommend(request));
    }

    // ── 스마트 재고 보충 ─────────────────────────────────────────────

    @Operation(
            summary = "스마트 재고 보충 추천",
            description = "리드타임, 일평균 판매량, 트렌드 기반 재고 보충 시점 최적화. " +
                    "긴급도(CRITICAL/HIGH/MEDIUM/LOW) + 권장 발주 수량 반환."
    )
    @PostMapping("/inventory/replenishment")
    public ResponseEntity<ReplenishmentResponse> recommendReplenishment(
            @RequestBody ReplenishmentRequest request) {
        return ResponseEntity.ok(smartReplenishmentService.recommend(request));
    }

    // ── 헬스체크 ─────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("AI service is running");
    }
}
