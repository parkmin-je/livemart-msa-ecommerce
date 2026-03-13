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
    private String buildDemoResponse(String message, String intent, List<ChatRequest.ChatHistory> history) {
        String lower = message.toLowerCase();

        // 이전 대화 컨텍스트 파악
        String prevIntent = "";
        if (history != null && !history.isEmpty()) {
            for (int i = history.size() - 1; i >= 0; i--) {
                ChatRequest.ChatHistory h = history.get(i);
                if ("user".equals(h.role())) {
                    prevIntent = detectIntent(h.content());
                    break;
                }
            }
        }

        // 방법/방식 관련 꼬리 질문 처리
        if (lower.contains("어떻게") || lower.contains("하는법") || lower.contains("하는 법") ||
            lower.contains("방법") || lower.contains("어디서") || lower.contains("어디에")) {
            String ctx = prevIntent.isEmpty() ? intent : prevIntent;
            return switch (ctx) {
                case "order_inquiry" -> "배송 조회 방법을 안내해 드릴게요.\n\n① 상단 메뉴 또는 마이페이지를 클릭하세요.\n② '주문내역'을 선택하면 주문 목록이 나타납니다.\n③ 조회하실 주문을 클릭하면 실시간 배송 현황을 확인할 수 있습니다.\n\n택배사 송장번호도 함께 제공되어 직접 조회도 가능합니다. 다른 궁금한 점이 있으신가요?";
                case "refund" -> "반품/환불 신청 방법을 안내해 드릴게요.\n\n① 마이페이지 > 주문내역으로 이동하세요.\n② 반품/환불을 원하는 주문을 선택합니다.\n③ '반품/환불 신청' 버튼을 클릭하고 사유를 선택하세요.\n④ 신청 후 1~2 영업일 내 회수가 진행됩니다.\n\n환불은 회수 완료 후 영업일 기준 3~5일 내 처리됩니다. 더 궁금하신 점이 있으신가요?";
                case "coupon" -> "쿠폰 사용 방법을 안내해 드릴게요.\n\n① 마이페이지 > 쿠폰함에서 보유 쿠폰을 확인하세요.\n② 주문 시 결제 페이지에서 '쿠폰 적용'을 선택하세요.\n③ 사용 가능한 쿠폰 목록에서 원하시는 쿠폰을 선택하면 자동으로 할인됩니다.\n\n쿠폰 적용 후 결제 금액을 꼭 확인해 주세요. 다른 도움이 필요하신가요?";
                case "product_info" -> "상품 정보 확인 방법을 안내해 드릴게요.\n\n① 상단 검색창에서 상품명 또는 키워드를 입력하세요.\n② 검색 결과에서 원하는 상품을 클릭하면 상세 정보를 볼 수 있습니다.\n③ 상품 상세 페이지에서 사양, 재고, 판매자 정보, 고객 리뷰를 확인할 수 있습니다.\n\n원하시는 상품을 찾지 못하셨다면 알려주세요!";
                default -> "마이페이지에서 대부분의 서비스를 이용하실 수 있습니다. 주문조회, 반품/환불, 쿠폰, 위시리스트 등 원하시는 기능이 있으시면 구체적으로 말씀해 주세요.";
            };
        }

        // 인사/첫 메시지
        if (lower.contains("안녕") || lower.contains("처음") || lower.contains("도움")) {
            return "안녕하세요! LiveMart AI 상담원입니다.\n\n다음과 같은 도움을 드릴 수 있어요.\n• 주문/배송 조회\n• 반품/환불 신청 방법\n• 쿠폰 사용 방법\n• 상품 검색 방법\n\n어떤 점이 궁금하신가요?";
        }

        // 의도별 응답
        return switch (intent) {
            case "order_inquiry" -> {
                if (lower.contains("언제") || lower.contains("도착") || lower.contains("얼마나")) {
                    yield "배송 예상 기간은 결제 완료 후 영업일 기준 2~3일입니다. 제주/도서산간 지역은 1~2일 추가될 수 있어요. 정확한 배송 현황은 마이페이지 > 주문내역에서 실시간으로 확인하실 수 있습니다.";
                }
                yield "주문/배송 관련 문의이군요. 마이페이지 > 주문내역에서 실시간 배송 현황을 확인하실 수 있습니다. 배송 조회 방법이나 다른 궁금한 점을 말씀해 주시면 더 자세히 안내해 드릴게요.";
            }
            case "refund" -> {
                if (lower.contains("기간") || lower.contains("얼마나") || lower.contains("며칠")) {
                    yield "반품 신청 가능 기간은 상품 수령 후 7일 이내입니다. 환불은 반품 회수 완료 후 영업일 기준 3~5일 내 처리되며, 카드 결제의 경우 카드사 정책에 따라 다소 차이가 있을 수 있습니다.";
                }
                yield "반품/환불 문의이군요. 상품 수령 후 7일 이내 반품 신청이 가능합니다. 마이페이지 > 주문내역에서 신청하실 수 있어요. 구체적인 신청 방법이 궁금하시면 말씀해 주세요!";
            }
            case "coupon" -> "쿠폰 관련 문의이군요. 보유하신 쿠폰은 마이페이지 > 쿠폰함에서 확인 가능하며, 결제 시 자동으로 적용 가능 쿠폰 목록이 표시됩니다. 쿠폰 사용 방법을 더 자세히 알고 싶으신가요?";
            case "product_info" -> "상품 관련 문의이군요. 검색창에서 원하시는 상품을 검색하시면 사양, 재고, 판매자 정보를 상세히 확인하실 수 있습니다. 특정 상품에 대해 궁금하신 점이 있으시면 알려주세요!";
            case "payment" -> "결제 관련 문의이군요. LiveMart는 신용카드, 체크카드, 무통장입금 등 다양한 결제 수단을 지원합니다. 결제 관련 문제가 발생하셨다면 주문번호와 함께 구체적인 상황을 알려주세요.";
            default -> {
                if (!prevIntent.isEmpty() && !prevIntent.equals("general")) {
                    // 꼬리 질문으로 추정 — 이전 주제 유지
                    yield buildDemoResponse(message, prevIntent, null);
                }
                yield "네, 말씀해 주세요! 주문/배송 조회, 반품/환불, 쿠폰 사용, 상품 문의 등 무엇이든 도와드리겠습니다.";
            }
        };
    }

    /** 동기 응답 */
    public ChatResponse chat(ChatRequest req) {
        String sessionId = req.sessionId() != null ? req.sessionId() : UUID.randomUUID().toString();

        // 데모 모드: OpenAI API Key가 없으면 규칙 기반 응답
        if (isDemoMode()) {
            String intent = detectIntent(req.message());
            boolean escalate = shouldEscalate("", req.message());
            String demoReply = buildDemoResponse(req.message(), intent, req.history());
            saveHistory(sessionId, req.message(), demoReply);
            log.info("Demo mode chatbot response: session={}, intent={}", sessionId, intent);
            return new ChatResponse(sessionId, demoReply, intent, escalate);
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
            List<ChatRequest.ChatHistory> history = loadHistoryAsList(sessionId, req.history());
            String demoText = buildDemoResponse(req.message(), intent, history);
            saveHistory(sessionId, req.message(), demoText);
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

    /** Redis + 클라이언트 히스토리를 합쳐 ChatHistory 리스트로 반환 */
    @SuppressWarnings("unchecked")
    private List<ChatRequest.ChatHistory> loadHistoryAsList(String sessionId, List<ChatRequest.ChatHistory> clientHistory) {
        var combined = new ArrayList<ChatRequest.ChatHistory>();
        try {
            var storedHistory = (List<List<String>>) redisTemplate.opsForValue().get(SESSION_KEY + sessionId);
            if (storedHistory != null) {
                storedHistory.forEach(turn -> {
                    if (turn.size() == 2) {
                        combined.add(new ChatRequest.ChatHistory("user", turn.get(0)));
                        combined.add(new ChatRequest.ChatHistory("assistant", turn.get(1)));
                    }
                });
            }
        } catch (Exception e) {
            log.warn("Failed to load demo history: {}", e.getMessage());
        }
        if (clientHistory != null) combined.addAll(clientHistory);
        return combined;
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
        if (lower.contains("주문") || lower.contains("배송") || lower.contains("도착") ||
            lower.contains("송장") || lower.contains("택배") || lower.contains("언제와") ||
            lower.contains("조회")) return "order_inquiry";
        if (lower.contains("환불") || lower.contains("반품") || lower.contains("취소") ||
            lower.contains("교환") || lower.contains("돌려")) return "refund";
        if (lower.contains("쿠폰") || lower.contains("할인") || lower.contains("포인트")) return "coupon";
        if (lower.contains("결제") || lower.contains("카드") || lower.contains("입금") ||
            lower.contains("payment")) return "payment";
        if (lower.contains("상품") || lower.contains("제품") || lower.contains("사이즈") ||
            lower.contains("재고") || lower.contains("사양") || lower.contains("스펙")) return "product_info";
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
