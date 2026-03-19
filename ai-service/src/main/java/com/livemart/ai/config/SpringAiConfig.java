package com.livemart.ai.config;

import com.livemart.ai.memory.RedisChatMemory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring AI 1.0 ChatClient 설정
 *
 * - OpenAI GPT-4o-mini 기반 ChatClient
 * - Redis 기반 대화 메모리 (세션별 최대 10턴, 30분 TTL)
 * - Tool Calling: 주문 조회 / 상품 검색 / 반품 정책
 * - SimpleLoggerAdvisor: 입출력 토큰 로깅 (비용 모니터링용)
 */
@Configuration
public class SpringAiConfig {

    private static final String SYSTEM_PROMPT = """
            당신은 LiveMart의 AI 고객 서비스 상담원입니다.

            [역할]
            - 주문/배송 조회, 반품/환불 안내, 상품 검색, 쿠폰/포인트 안내를 담당합니다.
            - 제공된 도구(Tool)를 적극 활용하여 정확한 실시간 정보를 제공하세요.

            [응답 규칙]
            - 항상 한국어로 응답하세요.
            - 2~4문장으로 간결하게 답변하세요.
            - 불확실한 정보는 추측하지 말고 "확인이 필요합니다"라고 솔직하게 말하세요.
            - 분쟁, 법적 문제, 긴급 사안은 반드시 "상담원 연결을 권장합니다"로 안내하세요.
            - 친절하고 공감하는 톤을 유지하세요.

            [도구 사용 가이드]
            - 주문번호를 언급하면 즉시 getOrderStatus 도구를 호출하세요.
            - 상품 검색 요청 시 searchProducts 도구를 호출하세요.
            - 반품/환불 관련 문의 시 getReturnPolicy 도구로 정확한 정책을 확인하세요.
            """;

    @Bean
    public ChatClient chatClient(OpenAiChatModel chatModel, RedisChatMemory redisChatMemory) {
        return ChatClient.builder(chatModel)
                .defaultSystem(SYSTEM_PROMPT)
                .defaultAdvisors(
                        new MessageChatMemoryAdvisor(redisChatMemory),
                        new SimpleLoggerAdvisor()
                )
                .build();
    }
}
