package com.livemart.ai.service;

import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.ChatRequest;
import com.livemart.ai.dto.ChatResponse;
import com.livemart.ai.dto.OpenAiRequest;
import com.livemart.ai.tools.LivemartTools;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * AI CS 챗봇 서비스 — OpenAI Function Calling 패턴 구현
 *
 * [아키텍처]
 * 1. 사용자 메시지에서 Tool 호출 필요 여부 판단 (주문번호 포함 여부 등)
 * 2. LivemartTools로 필요 정보 조회 (주문 상태 / 상품 검색 / 반품 정책)
 * 3. 조회된 컨텍스트를 시스템 프롬프트에 삽입하여 GPT-4o-mini에 전달
 *    → OpenAI Function Calling과 동일한 효과를 프롬프트 수준에서 달성
 *
 * [Spring AI 마이그레이션 경로]
 * build.gradle에 spring-ai-openai-spring-boot-starter 추가 후:
 * - ChatClient + MessageChatMemoryAdvisor + @Description Function 빈으로 전환
 * - 현재 LivemartTools의 메서드들을 그대로 @Bean으로 래핑 가능
 *
 * [데모 모드]
 * OPENAI_API_KEY 미설정 시 규칙 기반 응답 (LivemartTools 활용)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private static final String SESSION_KEY = "ai:chat:session:";
    private static final Duration SESSION_TTL = Duration.ofMinutes(30);

    private final OpenAiClient openAiClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final LivemartTools tools;

    @Value("${spring.ai.openai.api-key:${openai.api.key:}}")
    private String apiKey;

    @Value("${spring.ai.openai.chat.options.model:gpt-4o-mini}")
    private String model;

    private boolean isDemoMode() {
        return apiKey == null || apiKey.isBlank();
    }

    /** 동기 응답 */
    public ChatResponse chat(ChatRequest req) {
        String sessionId = req.sessionId() != null ? req.sessionId() : UUID.randomUUID().toString();
        String intent = detectIntent(req.message());

        if (isDemoMode()) {
            return handleDemoMode(sessionId, req, intent);
        }

        try {
            var messages = buildMessages(req, sessionId);
            var request = OpenAiRequest.builder()
                    .model(model)
                    .messages(messages)
                    .maxTokens(800)
                    .temperature(0.3)
                    .stream(false)
                    .build();

            var response = openAiClient.chat(request);
            var content = response.extractContent();
            boolean escalate = shouldEscalate(content, req.message());
            saveHistory(sessionId, req.message(), content);
            log.info("Chatbot response: session={}, intent={}, escalate={}", sessionId, intent, escalate);
            return new ChatResponse(sessionId, content, intent, escalate);

        } catch (Exception e) {
            log.error("ChatClient call failed, falling back to demo mode: {}", e.getMessage());
            return handleDemoMode(sessionId, req, intent);
        }
    }

    /** SSE 스트리밍 응답 */
    public Flux<String> chatStream(ChatRequest req) {
        String sessionId = req.sessionId() != null ? req.sessionId() : UUID.randomUUID().toString();

        if (isDemoMode()) {
            String demoText = buildDemoResponse(req.message(), detectIntent(req.message()), req);
            return Flux.fromArray(demoText.split("(?<=\\n)|(?<=다\\. )|(?<=요\\. )"))
                    .filter(s -> !s.isEmpty());
        }

        try {
            var messages = buildMessages(req, sessionId);
            var request = OpenAiRequest.builder()
                    .model(model)
                    .messages(messages)
                    .maxTokens(800)
                    .temperature(0.3)
                    .stream(true)
                    .build();
            return openAiClient.chatStream(request);
        } catch (Exception e) {
            log.error("Stream init failed: {}", e.getMessage());
            String demoText = buildDemoResponse(req.message(), detectIntent(req.message()), req);
            return Flux.just(demoText);
        }
    }

    // ── 메시지 조립 (Tool Calling 컨텍스트 삽입) ──────────────────────────────

    private List<OpenAiRequest.Message> buildMessages(ChatRequest req, String sessionId) {
        var messages = new ArrayList<OpenAiRequest.Message>();

        // Tool 실행: 주문번호 감지 시 주문 상태를 컨텍스트로 삽입
        String toolContext = buildToolContext(req.message(), req.orderContext());
        messages.add(OpenAiRequest.Message.system(buildSystemPrompt(req.orderContext(), toolContext)));

        // Redis 이전 히스토리 로드
        var historyKey = SESSION_KEY + sessionId;
        try {
            @SuppressWarnings("unchecked")
            var storedHistory = (List<List<String>>) redisTemplate.opsForValue().get(historyKey);
            if (storedHistory != null) {
                storedHistory.forEach(turn -> {
                    if (turn.size() == 2) {
                        messages.add(OpenAiRequest.Message.user(turn.get(0)));
                        messages.add(OpenAiRequest.Message.assistant(turn.get(1)));
                    }
                });
            }
        } catch (Exception e) {
            log.warn("Failed to load chat history: {}", e.getMessage());
        }

        if (req.history() != null) {
            req.history().forEach(h -> {
                if ("user".equals(h.role())) messages.add(OpenAiRequest.Message.user(h.content()));
                else if ("assistant".equals(h.role())) messages.add(OpenAiRequest.Message.assistant(h.content()));
            });
        }

        messages.add(OpenAiRequest.Message.user(req.message()));
        return messages;
    }

    /**
     * Tool Calling 컨텍스트 생성
     * OpenAI Function Calling 대신 프롬프트 주입 방식으로 동일 효과 달성
     */
    private String buildToolContext(String message, ChatRequest.OrderContext orderCtx) {
        var sb = new StringBuilder();

        // 주문번호 감지 → 주문 상태 자동 조회
        if (tools.containsOrderNumber(message)) {
            String orderNum = tools.extractOrderNumber(message);
            if (orderNum != null) {
                sb.append("\n[Tool: getOrderStatus]\n");
                sb.append(tools.getOrderStatus(orderNum));
                sb.append("\n");
            }
        }

        // 주문 컨텍스트 제공된 경우 반품 정책도 조회
        if (orderCtx != null && (message.contains("반품") || message.contains("환불"))) {
            sb.append("\n[Tool: getReturnPolicy]\n");
            sb.append(tools.getReturnPolicy("general"));
            sb.append("\n");
        }

        return sb.toString();
    }

    // ── 데모 모드 ──────────────────────────────────────────────────────────────

    private ChatResponse handleDemoMode(String sessionId, ChatRequest req, String intent) {
        boolean escalate = shouldEscalate("", req.message());
        String response = buildDemoResponse(req.message(), intent, req);
        saveHistory(sessionId, req.message(), response);
        log.info("[DemoMode] session={}, intent={}", sessionId, intent);
        return new ChatResponse(sessionId, response, intent, escalate);
    }

    private String buildDemoResponse(String message, String intent, ChatRequest req) {
        String lower = message.toLowerCase();

        // 주문번호 포함 시 Tool 결과 활용
        if (tools.containsOrderNumber(message)) {
            String orderNum = tools.extractOrderNumber(message);
            if (orderNum != null) {
                String status = tools.getOrderStatus(orderNum);
                if (status.contains("SHIPPING")) {
                    return orderNum + " 주문은 현재 배송 중입니다.\n\nCJ대한통운을 통해 오늘 오후 6시~9시 도착 예정입니다. " +
                           "송장번호: 1234567890123\n\n더 궁금한 점이 있으신가요?";
                } else if (status.contains("DELIVERED")) {
                    return orderNum + " 주문은 어제 오후 3시 22분에 배송 완료되었습니다.\n\n" +
                           "현관 문 앞에 놓아두었습니다. 수령 확인이 안 되셨다면 고객센터로 연락해 주세요.";
                } else if (status.contains("PREPARING")) {
                    return orderNum + " 주문은 현재 상품 준비 중입니다.\n\n내일 오전 중 출고될 예정이며, " +
                           "출고 완료 시 SMS로 알림을 보내드립니다.";
                }
                return orderNum + " 주문은 결제 확인 완료 상태입니다.\n\n1~2 영업일 내 발송 예정입니다.";
            }
        }

        if (lower.contains("안녕") || lower.contains("처음") || lower.contains("도움")) {
            return "안녕하세요! LiveMart AI 고객 서비스입니다.\n\n" +
                   "• 주문/배송 실시간 조회 (주문번호 입력 시 즉시 확인)\n" +
                   "• 반품/환불 신청 안내\n" +
                   "• 상품 검색 및 추천\n" +
                   "• 쿠폰/포인트 조회\n\n" +
                   "무엇을 도와드릴까요?";
        }

        return switch (intent) {
            case "order_inquiry" -> "주문/배송 조회 문의이군요.\n\n" +
                    "마이페이지 → 주문내역에서 실시간 배송 현황을 확인할 수 있습니다. " +
                    "주문번호(예: LM-20240315-001234)를 알려주시면 제가 직접 조회해 드릴게요!";
            case "refund" -> {
                String policy = tools.getReturnPolicy("general");
                yield "반품/환불 문의이군요.\n\n" +
                        "상품 수령 후 7일 이내 신청 가능하며, " +
                        "마이페이지 → 주문내역 → 반품/환불 신청으로 진행하실 수 있습니다.\n" +
                        "환불은 회수 완료 후 영업일 3~5일 내 처리됩니다.";
            }
            case "coupon" -> "쿠폰/포인트 문의이군요.\n\n" +
                    "마이페이지 → 쿠폰함에서 보유 쿠폰을 확인하시고, " +
                    "결제 시 자동으로 사용 가능한 쿠폰 목록이 표시됩니다.";
            case "product_info" -> "상품 문의이군요.\n\n" +
                    "검색창에서 키워드로 검색하시면 상세 정보, 재고, 리뷰를 확인하실 수 있습니다. " +
                    "특정 상품이 궁금하시면 상품명을 알려주세요!";
            case "payment" -> "결제 관련 문의이군요.\n\n" +
                    "신용/체크카드, 무통장입금, 카카오페이, 네이버페이 등을 지원합니다. " +
                    "결제 오류가 발생하셨다면 주문번호와 함께 알려주세요.";
            default -> "네, 말씀해 주세요!\n\n" +
                    "주문/배송 조회, 반품/환불, 상품 검색, 쿠폰 조회 등 무엇이든 도와드리겠습니다.";
        };
    }

    // ── 히스토리 저장 ──────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void saveHistory(String sessionId, String userMsg, String botMsg) {
        var historyKey = SESSION_KEY + sessionId;
        try {
            var history = (List<List<String>>) redisTemplate.opsForValue().get(historyKey);
            if (history == null) history = new ArrayList<>();
            history.add(List.of(userMsg, botMsg));
            if (history.size() > 10) {
                history = new ArrayList<>(history.subList(history.size() - 10, history.size()));
            }
            redisTemplate.opsForValue().set(historyKey, history, SESSION_TTL);
        } catch (Exception e) {
            log.warn("Failed to save chat history: {}", e.getMessage());
        }
    }

    // ── Intent Detection ───────────────────────────────────────────────────────

    private String detectIntent(String message) {
        String lower = message.toLowerCase();
        if (lower.contains("주문") || lower.contains("배송") || lower.contains("도착") ||
            lower.contains("송장") || lower.contains("택배") || lower.contains("조회") ||
            lower.contains("lm-") || lower.contains("언제와")) return "order_inquiry";
        if (lower.contains("환불") || lower.contains("반품") || lower.contains("취소") ||
            lower.contains("교환")) return "refund";
        if (lower.contains("쿠폰") || lower.contains("할인") || lower.contains("포인트")) return "coupon";
        if (lower.contains("결제") || lower.contains("카드") || lower.contains("입금")) return "payment";
        if (lower.contains("상품") || lower.contains("제품") || lower.contains("재고") ||
            lower.contains("추천")) return "product_info";
        return "general";
    }

    private boolean shouldEscalate(String response, String message) {
        String lower = message.toLowerCase();
        return lower.contains("화나") || lower.contains("사기") || lower.contains("법적") ||
               lower.contains("소비자보호") || lower.contains("고소") ||
               (response != null && response.contains("상담원"));
    }

    private String buildSystemPrompt(ChatRequest.OrderContext ctx, String toolContext) {
        String orderInfo = "";
        if (ctx != null) {
            orderInfo = "\n[현재 고객 주문 컨텍스트]\n" +
                    "주문번호: " + ctx.orderNumber() + "\n" +
                    "주문 상태: " + ctx.status() + "\n" +
                    "배송 상태: " + ctx.deliveryStatus() + "\n" +
                    "예상 도착일: " + ctx.expectedDelivery() + "\n";
        }

        return """
                당신은 LiveMart의 AI 고객 서비스 상담원입니다.
                친절하고 정확하게 고객 문의를 처리하세요.
                %s
                %s
                처리 가능한 업무:
                - 주문 상태 조회 및 배송 문의
                - 반품/환불 절차 안내
                - 상품 정보 제공
                - 쿠폰/포인트 사용 방법

                규칙:
                - 존댓말 사용, 2~4문장으로 간결하게 답변
                - 확실하지 않은 정보는 "확인이 필요합니다"라고 솔직하게 답변
                - 복잡한 분쟁이나 긴급 사안은 "상담원 연결을 권장합니다"로 안내
                - 한국어로만 응답
                """.formatted(orderInfo, toolContext.isBlank() ? "" : "[조회된 정보]\n" + toolContext);
    }
}
