package com.livemart.ai.service;

import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.ChatRequest;
import com.livemart.ai.dto.ChatResponse;
import com.livemart.ai.dto.OpenAiRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AI CS 챗봇 서비스
 *
 * 기능:
 * 1. 주문 상태 조회 컨텍스트 기반 RAG-style 응답
 * 2. 상담 의도(intent) 감지: 주문조회 | 환불 | 상품문의 | 일반
 * 3. 상담원 에스컬레이션 감지
 * 4. 대화 이력 Redis 저장 (30분 TTL)
 * 5. 스트리밍(SSE) 지원
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private static final String SESSION_KEY = "ai:chat:session:";
    private static final Duration SESSION_TTL = Duration.ofMinutes(30);

    private final OpenAiClient openAiClient;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${openai.model.chat:gpt-4o-mini}")
    private String model;

    @Value("${openai.api.key:}")
    private String apiKey;

    private boolean isDemoMode() {
        return apiKey == null || apiKey.isBlank();
    }

    /** 데모 모드: OpenAI API Key 없을 때 규칙 기반 응답 */
    private String buildDemoResponse(String message, String intent) {
        return switch (intent) {
            case "order_inquiry" -> "안녕하세요! 주문/배송 관련 문의를 주셨군요. 정확한 배송 현황은 마이페이지 > 주문내역에서 실시간으로 확인하실 수 있습니다. 추가 문의가 있으시면 언제든지 알려주세요.";
            case "refund" -> "반품/환불 문의를 주셨군요. 상품 수령 후 7일 이내에 반품 신청이 가능하며, 환불은 신청 후 영업일 기준 3~5일 내 처리됩니다. 마이페이지 > 주문내역에서 반품 신청을 진행해 주세요.";
            case "product_info" -> "상품 관련 문의를 주셨군요. 상품 상세 페이지에서 사양, 재고, 판매자 정보를 확인하실 수 있습니다. 궁금하신 상품명을 알려주시면 더 자세히 안내해 드리겠습니다.";
            default -> "안녕하세요! LiveMart 고객 서비스 AI 상담원입니다. 주문 조회, 반품/환불, 상품 문의 등 다양한 도움을 드릴 수 있습니다. 어떤 점이 궁금하신가요?";
        };
    }

    /** 동기 응답 */
    public ChatResponse chat(ChatRequest req) {
        String sessionId = req.sessionId() != null ? req.sessionId() : UUID.randomUUID().toString();

        // 데모 모드: OpenAI API Key가 없으면 규칙 기반 응답
        if (isDemoMode()) {
            String intent = detectIntent(req.message());
            boolean escalate = shouldEscalate("", req.message());
            log.info("Demo mode chatbot response: session={}, intent={}", sessionId, intent);
            return new ChatResponse(sessionId, buildDemoResponse(req.message(), intent), intent, escalate);
        }

        var messages = buildMessages(req, sessionId);

        var request = OpenAiRequest.builder()
                .model(model)
                .messages(messages)
                .maxTokens(800)
                .temperature(0.3)   // CS 챗봇은 일관성 중요 → 낮은 temperature
                .stream(false)
                .build();

        var response = openAiClient.chat(request);
        var content = response.extractContent();

        // 의도 감지 & 에스컬레이션 판단
        String intent = detectIntent(req.message());
        boolean escalate = shouldEscalate(content, req.message());

        // 대화 이력 저장
        saveHistory(sessionId, req.message(), content);

        log.info("Chatbot response: session={}, intent={}, escalate={}", sessionId, intent, escalate);
        return new ChatResponse(sessionId, content, intent, escalate);
    }

    /** 스트리밍 SSE 응답 */
    public Flux<String> chatStream(ChatRequest req) {
        String sessionId = req.sessionId() != null ? req.sessionId() : UUID.randomUUID().toString();

        // 데모 모드: 데모 텍스트를 단어 단위로 스트리밍
        if (isDemoMode()) {
            String intent = detectIntent(req.message());
            String demoText = buildDemoResponse(req.message(), intent);
            return Flux.fromArray(demoText.split("(?<=\\s)|(?=\\s)"))
                    .filter(s -> !s.isEmpty());
        }

        var messages = buildMessages(req, sessionId);

        var request = OpenAiRequest.builder()
                .model(model)
                .messages(messages)
                .maxTokens(800)
                .temperature(0.3)
                .stream(true)
                .build();

        // 스트리밍 완료 후 히스토리 저장은 별도 처리
        return openAiClient.chatStream(request);
    }

    private List<OpenAiRequest.Message> buildMessages(ChatRequest req, String sessionId) {
        var messages = new ArrayList<OpenAiRequest.Message>();

        // 시스템 프롬프트 (주문 컨텍스트 포함)
        messages.add(OpenAiRequest.Message.system(buildSystemPrompt(req.orderContext())));

        // Redis에서 이전 히스토리 로드
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

        // 요청에 포함된 히스토리 (클라이언트 제공)
        if (req.history() != null) {
            req.history().forEach(h -> {
                if ("user".equals(h.role())) {
                    messages.add(OpenAiRequest.Message.user(h.content()));
                } else if ("assistant".equals(h.role())) {
                    messages.add(OpenAiRequest.Message.assistant(h.content()));
                }
            });
        }

        // 현재 사용자 메시지
        messages.add(OpenAiRequest.Message.user(req.message()));
        return messages;
    }

    @SuppressWarnings("unchecked")
    private void saveHistory(String sessionId, String userMsg, String botMsg) {
        var historyKey = SESSION_KEY + sessionId;
        try {
            var history = (List<List<String>>) redisTemplate.opsForValue().get(historyKey);
            if (history == null) history = new ArrayList<>();

            history.add(List.of(userMsg, botMsg));

            // 최근 10턴만 유지
            if (history.size() > 10) {
                history = new ArrayList<>(history.subList(history.size() - 10, history.size()));
            }
            redisTemplate.opsForValue().set(historyKey, history, SESSION_TTL);
        } catch (Exception e) {
            log.warn("Failed to save chat history: {}", e.getMessage());
        }
    }

    private String detectIntent(String message) {
        String lower = message.toLowerCase();
        if (lower.contains("주문") || lower.contains("배송") || lower.contains("도착")) return "order_inquiry";
        if (lower.contains("환불") || lower.contains("반품") || lower.contains("취소")) return "refund";
        if (lower.contains("상품") || lower.contains("제품") || lower.contains("사이즈")) return "product_info";
        return "general";
    }

    private boolean shouldEscalate(String response, String message) {
        // 불만이 심하거나 복잡한 케이스 → 상담원 연결
        String lower = message.toLowerCase();
        return lower.contains("화나") || lower.contains("사기") || lower.contains("법적") ||
                lower.contains("소비자보호") || response.contains("상담원");
    }

    private String buildSystemPrompt(ChatRequest.OrderContext ctx) {
        String orderInfo = "";
        if (ctx != null) {
            orderInfo = """
                    [주문 정보]
                    주문번호: %s
                    주문 상태: %s
                    배송 상태: %s
                    예상 도착일: %s
                    """.formatted(ctx.orderNumber(), ctx.status(), ctx.deliveryStatus(), ctx.expectedDelivery());
        }

        return """
                당신은 LiveMart 고객 서비스 AI 상담원입니다.
                친절하고 정확하게 고객 문의를 처리하세요.

                %s

                처리 가능한 업무:
                - 주문 상태 조회 및 배송 문의
                - 반품/환불 절차 안내
                - 상품 정보 제공
                - 쿠폰/포인트 사용 방법

                규칙:
                - 존댓말 사용, 2~3문장으로 간결하게 답변
                - 확실하지 않은 정보는 "확인이 필요합니다"라고 솔직하게 답변
                - 복잡한 분쟁이나 긴급 사안은 "상담원 연결을 권장합니다"로 안내
                - 한국어로만 응답
                """.formatted(orderInfo);
    }
}
