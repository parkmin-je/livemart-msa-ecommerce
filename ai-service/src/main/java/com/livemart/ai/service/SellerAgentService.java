package com.livemart.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.HunterAlphaClient;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Seller AI Agent — Hunter Alpha (MiMo-V2-Pro) 기반 멀티스텝 자율 에이전트
 *
 * 입력: 카테고리 + 상품명
 * 자율 실행 단계:
 *   1. 카테고리 시장 분석
 *   2. 경쟁 가격 조사
 *   3. 수요 예측
 *   4. 상품 설명 생성
 *   5. 최적 재고 수준 계산
 *   6. 종합 리포트 생성
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SellerAgentService {

    private final HunterAlphaClient hunterAlphaClient;
    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public SellerAgentResponse runAgent(SellerAgentRequest request) {
        boolean useHunter = hunterAlphaClient.isEnabled();
        log.info("Seller Agent started — model: {}, product: {}",
                useHunter ? "Hunter Alpha" : "GPT-4o-mini", request.getProductName());

        try {
            String systemPrompt = buildSellerAgentSystemPrompt();
            String userPrompt = buildSellerAgentUserPrompt(request);

            List<OpenAiRequest.Message> messages = List.of(
                    OpenAiRequest.Message.system(systemPrompt),
                    OpenAiRequest.Message.user(userPrompt)
            );

            OpenAiRequest aiRequest = OpenAiRequest.builder()
                    .model(useHunter ? "xiaomi/mimo-v2-pro" : "gpt-4o-mini")
                    .messages(messages)
                    .temperature(0.7)
                    .maxTokens(2000)
                    .build();

            OpenAiResponse response;
            if (useHunter) {
                response = hunterAlphaClient.chat(aiRequest);
            } else {
                try {
                    response = openAiClient.chat(aiRequest);
                } catch (Exception e) {
                    log.warn("GPT-4o-mini unavailable, using demo mode: {}", e.getMessage());
                    return demoResponse(request);
                }
            }

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return demoResponse(request);
            }

            String content = response.choices().get(0).message().content();
            return parseAgentResponse(content, request);

        } catch (Exception e) {
            log.error("Seller Agent error: {}", e.getMessage());
            return demoResponse(request);
        }
    }

    private String buildSellerAgentSystemPrompt() {
        return """
                당신은 LiveMart 이커머스 플랫폼의 AI 셀러 에이전트입니다.
                판매자가 상품 정보를 입력하면 다음 단계를 자율적으로 수행합니다:

                [에이전트 실행 단계]
                STEP 1: 카테고리 시장 분석 — 해당 카테고리의 시장 트렌드와 경쟁 강도 분석
                STEP 2: 가격 전략 수립 — 원가, 경쟁사, 수요 탄력성 기반 최적 가격 범위 계산
                STEP 3: 수요 예측 — 초기 재고 수준과 재주문 임계값 결정
                STEP 4: 상품 설명 생성 — SEO 최적화된 한국어 상품명, 설명, 판매 포인트, 태그 생성
                STEP 5: 종합 인사이트 — 판매자를 위한 시장 진입 전략 요약

                반드시 다음 JSON 형식으로만 응답하세요:
                {
                  "shortDescription": "30자 이내 한 줄 설명",
                  "fullDescription": "200-300자 상세 설명",
                  "sellingPoint": "핵심 판매 포인트",
                  "seoTags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
                  "recommendedPrice": 숫자,
                  "priceStrategy": "가격 전략 설명",
                  "recommendedStock": 숫자,
                  "lowStockThreshold": 숫자,
                  "demandScore": 0.0~1.0,
                  "marketInsight": "시장 진입 전략 (100자 이내)",
                  "agentLog": "STEP1: ... | STEP2: ... | STEP3: ... | STEP4: ... | STEP5: ..."
                }
                """;
    }

    private String buildSellerAgentUserPrompt(SellerAgentRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("상품명: ").append(request.getProductName()).append("\n");
        sb.append("카테고리: ").append(request.getCategory()).append("\n");
        if (request.getKeywords() != null) sb.append("키워드: ").append(request.getKeywords()).append("\n");
        if (request.getTargetAudience() != null) sb.append("타겟 고객: ").append(request.getTargetAudience()).append("\n");
        if (request.getPriceRange() != null) sb.append("희망 가격대: ").append(request.getPriceRange()).append("원\n");
        return sb.toString();
    }

    private SellerAgentResponse parseAgentResponse(String content, SellerAgentRequest request) {
        try {
            String json = content.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            }
            JsonNode node = objectMapper.readTree(json);

            List<String> tags = new ArrayList<>();
            if (node.has("seoTags")) {
                node.get("seoTags").forEach(t -> tags.add(t.asText()));
            }

            return SellerAgentResponse.builder()
                    .productName(request.getProductName())
                    .shortDescription(node.path("shortDescription").asText(""))
                    .fullDescription(node.path("fullDescription").asText(""))
                    .sellingPoint(node.path("sellingPoint").asText(""))
                    .seoTags(tags)
                    .recommendedPrice(node.path("recommendedPrice").asDouble(0))
                    .priceStrategy(node.path("priceStrategy").asText(""))
                    .recommendedStock(node.path("recommendedStock").asInt(50))
                    .lowStockThreshold(node.path("lowStockThreshold").asInt(10))
                    .demandScore(node.path("demandScore").asDouble(0.5))
                    .marketInsight(node.path("marketInsight").asText(""))
                    .agentLog(node.path("agentLog").asText(""))
                    .demoMode(false)
                    .build();
        } catch (Exception e) {
            log.error("Agent response parse error: {}", e.getMessage());
            return demoResponse(request);
        }
    }

    private SellerAgentResponse demoResponse(SellerAgentRequest request) {
        return SellerAgentResponse.builder()
                .productName(request.getProductName())
                .shortDescription(request.getProductName() + " — 고품질 " + request.getCategory())
                .fullDescription(request.getProductName() + "은 " + request.getCategory() + " 카테고리의 인기 상품입니다. 고품질 소재와 합리적인 가격으로 많은 고객에게 사랑받고 있습니다.")
                .sellingPoint("최고의 품질, 합리적인 가격")
                .seoTags(List.of(request.getCategory(), request.getProductName(), "추천", "인기", "베스트"))
                .recommendedPrice(29900.0)
                .priceStrategy("경쟁 가격 전략 — 시장 평균 대비 5% 낮은 진입 가격")
                .recommendedStock(100)
                .lowStockThreshold(20)
                .demandScore(0.7)
                .marketInsight("초기 진입 시 할인 쿠폰 제공으로 리뷰 확보 후 가격 정상화 전략 권장")
                .agentLog("STEP1: 카테고리 분석 완료 | STEP2: 가격 전략 수립 | STEP3: 재고 계획 | STEP4: 설명 생성 | STEP5: 인사이트 도출 [데모 모드]")
                .demoMode(true)
                .build();
    }
}
