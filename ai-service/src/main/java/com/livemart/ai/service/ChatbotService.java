package com.livemart.ai.service;

import com.livemart.ai.dto.ChatRequest;
import com.livemart.ai.dto.ChatResponse;
import com.livemart.ai.tools.LivemartTools;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.UUID;

/**
 * Spring AI 기반 AI CS 챗봇 서비스
 *
 * [2026 아키텍처]
 * - Spring AI 1.0 ChatClient + Tool Calling
 * - Redis 기반 대화 메모리 (RedisChatMemory via MessageChatMemoryAdvisor)
 * - SSE 스트리밍 지원 (chatClient.prompt().stream().content())
 * - OpenAI GPT-4o-mini (비용 효율적 CS 특화 모델)
 * - API Key 미설정 시 규칙 기반 데모 모드로 Graceful Degradation
 *
 * [Tool Calling 흐름]
 * User → ChatClient → GPT-4o-mini → Tool Selection → Tool Execution → Final Response
 *   - getOrderStatus(orderNumber)    : 주문/배송 실시간 조회
 *   - searchProducts(keyword, ...)   : 상품 검색
 *   - getReturnPolicy(category)      : 반품/환불 정책 조회
 *   - getCouponAndPoints(userId)     : 쿠폰/포인트 잔액
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final ChatClient chatClient;

    @Value("${spring.ai.openai.api-key:}")
    private String openAiApiKey;

    private boolean isDemoMode() {
        return openAiApiKey == null || openAiApiKey.isBlank();
    }

    /** 동기 응답 (non-streaming) */
    public ChatResponse chat(ChatRequest req) {
        String sessionId = req.sessionId() != null ? req.sessionId() : UUID.randomUUID().toString();

        if (isDemoMode()) {
            return handleDemoMode(sessionId, req);
        }

        try {
            String systemOverride = buildSystemPrompt(req.orderContext());

            String response = chatClient.prompt()
                    .system(systemOverride)
                    .user(req.message())
                    .functions(LivemartTools.ALL_FUNCTIONS.toArray(String[]::new))
                    .advisors(a -> a
                            .param(MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY, sessionId)
                            .param(MessageChatMemoryAdvisor.CHAT_MEMORY_RETRIEVE_SIZE_KEY, 10)
                    )
                    .call()
                    .content();

            String intent = detectIntent(req.message());
            boolean escalate = shouldEscalate(response, req.message());

            log.info("AI response generated: session={}, intent={}, escalate={}, tokens={}",
                    sessionId, intent, escalate, response != null ? response.length() : 0);

            return new ChatResponse(sessionId, response, intent, escalate);

        } catch (Exception e) {
            log.error("ChatClient call failed, falling back to demo mode: {}", e.getMessage());
            return handleDemoMode(sessionId, req);
        }
    }

    /** SSE 스트리밍 응답 */
    public Flux<String> chatStream(ChatRequest req) {
        String sessionId = req.sessionId() != null ? req.sessionId() : UUID.randomUUID().toString();

        if (isDemoMode()) {
            String demoText = buildDemoResponse(req.message(), detectIntent(req.message()), req);
            return Flux.fromArray(demoText.split("(?<=\\n)|(?<=。)|(?<=다\\. )|(?<=요\\. )"))
                    .filter(s -> !s.isEmpty());
        }

        try {
            return chatClient.prompt()
                    .system(buildSystemPrompt(req.orderContext()))
                    .user(req.message())
                    .functions(LivemartTools.ALL_FUNCTIONS.toArray(String[]::new))
                    .advisors(a -> a
                            .param(MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY, sessionId)
                            .param(MessageChatMemoryAdvisor.CHAT_MEMORY_RETRIEVE_SIZE_KEY, 10)
                    )
                    .stream()
                    .content()
                    .doOnError(e -> log.error("Streaming error: session={}, error={}", sessionId, e.getMessage()));
        } catch (Exception e) {
            log.error("ChatClient stream init failed: {}", e.getMessage());
            String demoText = buildDemoResponse(req.message(), detectIntent(req.message()), req);
            return Flux.just(demoText);
        }
    }

    // ─── Demo Mode (API Key 없을 때 규칙 기반 응답) ──────────────────────────

    private ChatResponse handleDemoMode(String sessionId, ChatRequest req) {
        String intent = detectIntent(req.message());
        boolean escalate = shouldEscalate("", req.message());
        String response = buildDemoResponse(req.message(), intent, req);
        log.info("[DemoMode] session={}, intent={}", sessionId, intent);
        return new ChatResponse(sessionId, response, intent, escalate);
    }

    private String buildDemoResponse(String message, String intent, ChatRequest req) {
        String lower = message.toLowerCase();

        if (lower.contains("안녕") || lower.contains("처음") || lower.contains("도움")) {
            return "안녕하세요! LiveMart AI 고객 서비스입니다.\n\n" +
                   "• 주문/배송 실시간 조회\n" +
                   "• 반품/환불 신청 안내\n" +
                   "• 상품 검색 및 추천\n" +
                   "• 쿠폰/포인트 조회\n\n" +
                   "무엇을 도와드릴까요?";
        }

        return switch (intent) {
            case "order_inquiry" -> "주문/배송 조회 문의이군요.\n\n" +
                    "마이페이지 → 주문내역에서 실시간 배송 현황을 확인할 수 있습니다. " +
                    "주문번호를 알려주시면 제가 직접 조회해 드릴게요!";
            case "refund" -> "반품/환불 문의이군요.\n\n" +
                    "상품 수령 후 7일 이내 신청 가능하며, " +
                    "마이페이지 → 주문내역 → 반품/환불 신청으로 진행하실 수 있습니다. " +
                    "환불은 회수 완료 후 영업일 3~5일 내 처리됩니다.";
            case "coupon" -> "쿠폰/포인트 문의이군요.\n\n" +
                    "마이페이지 → 쿠폰함에서 보유 쿠폰을 확인하시고, " +
                    "결제 시 자동으로 사용 가능한 쿠폰 목록이 표시됩니다.";
            case "product_info" -> "상품 문의이군요.\n\n" +
                    "검색창에서 키워드로 검색하시면 상세 정보, 재고, 리뷰를 확인하실 수 있습니다. " +
                    "특정 상품이 궁금하시면 말씀해 주세요!";
            case "payment" -> "결제 관련 문의이군요.\n\n" +
                    "신용/체크카드, 무통장입금, 카카오페이, 네이버페이 등을 지원합니다. " +
                    "결제 오류가 발생하셨다면 주문번호와 함께 알려주세요.";
            default -> "네, 말씀해 주세요!\n\n" +
                    "주문/배송 조회, 반품/환불, 상품 검색, 쿠폰 조회 등 " +
                    "무엇이든 도와드리겠습니다.";
        };
    }

    // ─── Intent Detection ─────────────────────────────────────────────────────

    private String detectIntent(String message) {
        String lower = message.toLowerCase();
        if (lower.contains("주문") || lower.contains("배송") || lower.contains("도착") ||
            lower.contains("송장") || lower.contains("택배") || lower.contains("조회") ||
            lower.contains("lm-") || lower.contains("언제와")) return "order_inquiry";
        if (lower.contains("환불") || lower.contains("반품") || lower.contains("취소") ||
            lower.contains("교환") || lower.contains("돌려")) return "refund";
        if (lower.contains("쿠폰") || lower.contains("할인") || lower.contains("포인트")) return "coupon";
        if (lower.contains("결제") || lower.contains("카드") || lower.contains("입금") ||
            lower.contains("payment")) return "payment";
        if (lower.contains("상품") || lower.contains("제품") || lower.contains("사이즈") ||
            lower.contains("재고") || lower.contains("스펙") || lower.contains("추천")) return "product_info";
        return "general";
    }

    private boolean shouldEscalate(String response, String message) {
        String lower = message.toLowerCase();
        return lower.contains("화나") || lower.contains("사기") || lower.contains("법적") ||
               lower.contains("소비자보호") || lower.contains("고소") ||
               (response != null && response.contains("상담원"));
    }

    private String buildSystemPrompt(ChatRequest.OrderContext ctx) {
        if (ctx == null) {
            return ""; // SpringAiConfig의 defaultSystem 사용
        }
        return """
                [현재 고객 주문 컨텍스트]
                주문번호: %s
                주문 상태: %s
                배송 상태: %s
                예상 도착일: %s

                위 정보를 바탕으로 정확하게 안내하세요.
                """.formatted(ctx.orderNumber(), ctx.status(), ctx.deliveryStatus(), ctx.expectedDelivery());
    }
}
