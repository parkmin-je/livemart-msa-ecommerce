package com.livemart.ai.controller;

import com.livemart.ai.dto.*;
import com.livemart.ai.service.ChatbotService;
import com.livemart.ai.service.DescriptionGeneratorService;
import com.livemart.ai.service.RecommendationService;
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
 * POST /api/ai/recommend       — 개인화 상품 추천
 * POST /api/ai/description     — 상품 설명 자동 생성 (판매자 도구)
 * POST /api/ai/chat            — CS 챗봇 (동기)
 * POST /api/ai/chat/stream     — CS 챗봇 SSE 스트리밍
 */
@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI", description = "AI 기반 추천/생성/챗봇 API")
public class AiController {

    private final RecommendationService recommendationService;
    private final DescriptionGeneratorService descriptionGeneratorService;
    private final ChatbotService chatbotService;

    // ── 1. 개인화 상품 추천 ──────────────────────────────
    @Operation(summary = "AI 상품 추천", description = "사용자 구매 이력 기반 개인화 추천. Redis 10분 캐싱.")
    @PostMapping("/recommend")
    public ResponseEntity<RecommendationResponse> recommend(
            @Valid @RequestBody RecommendationRequest request) {
        var response = recommendationService.recommend(request);
        return ResponseEntity.ok(response);
    }

    // ── 2. 판매자 상품 설명 생성 ─────────────────────────
    @Operation(summary = "AI 상품 설명 생성", description = "판매자 도구: 상품명+키워드 → 한 줄 설명/본문/SEO 태그 자동 생성")
    @PostMapping("/description")
    public ResponseEntity<DescriptionResponse> generateDescription(
            @Valid @RequestBody DescriptionRequest request) {
        var response = descriptionGeneratorService.generate(request);
        return ResponseEntity.ok(response);
    }

    // ── 3. CS 챗봇 (동기) ───────────────────────────────
    @Operation(summary = "CS 챗봇", description = "고객 서비스 AI 챗봇. 주문 컨텍스트 포함 시 주문 상태 기반 답변.")
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        var response = chatbotService.chat(request);
        return ResponseEntity.ok(response);
    }

    // ── 4. CS 챗봇 SSE 스트리밍 ─────────────────────────
    @Operation(summary = "CS 챗봇 스트리밍", description = "Server-Sent Events로 토큰 단위 실시간 스트리밍")
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chatStream(@Valid @RequestBody ChatRequest request) {
        return chatbotService.chatStream(request);
    }

    // ── 헬스체크 ─────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("AI service is running");
    }
}
