package com.livemart.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.DescriptionRequest;
import com.livemart.ai.dto.DescriptionResponse;
import com.livemart.ai.dto.OpenAiRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 판매자용 AI 상품 설명 자동 생성 서비스
 *
 * 판매자가 상품명 + 키워드만 입력하면:
 * - 한 줄 설명 (검색 결과 카드용)
 * - 상세 페이지 본문 (2~3 단락)
 * - 핵심 판매 포인트
 * - SEO 태그 5개
 * 를 자동으로 생성
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DescriptionGeneratorService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    @Value("${openai.model.description:gpt-4o-mini}")
    private String model;

    public DescriptionResponse generate(DescriptionRequest req) {
        long start = System.currentTimeMillis();

        var prompt = buildPrompt(req);
        var request = OpenAiRequest.builder()
                .model(model)
                .messages(List.of(
                        OpenAiRequest.Message.system(buildSystemPrompt(req.tone())),
                        OpenAiRequest.Message.user(prompt)
                ))
                .maxTokens(1500)
                .temperature(0.8)
                .stream(false)
                .responseFormat(OpenAiRequest.ResponseFormat.jsonObject())
                .build();

        var aiResponse = openAiClient.chat(request);
        var content = aiResponse.extractContent();

        try {
            Map<String, Object> parsed = objectMapper.readValue(content, new TypeReference<>() {});

            @SuppressWarnings("unchecked")
            List<String> tagList = (List<String>) parsed.getOrDefault("tags", List.of());

            return new DescriptionResponse(
                    req.productName(),
                    (String) parsed.getOrDefault("shortDescription", ""),
                    (String) parsed.getOrDefault("fullDescription", ""),
                    (String) parsed.getOrDefault("sellingPoint", ""),
                    tagList.toArray(String[]::new),
                    System.currentTimeMillis() - start
            );
        } catch (Exception e) {
            log.error("Failed to parse description JSON: {}", e.getMessage());
            return new DescriptionResponse(req.productName(), content, "", "", new String[]{},
                    System.currentTimeMillis() - start);
        }
    }

    private String buildPrompt(DescriptionRequest req) {
        return """
                상품명: %s
                카테고리: %s
                핵심 키워드: %s
                가격대: %s원
                타겟 고객층: %s
                """.formatted(
                req.productName(),
                req.category() != null ? req.category() : "미분류",
                req.keywords() != null ? String.join(", ", req.keywords()) : "없음",
                req.targetPrice() != null ? String.format("%,d", req.targetPrice()) : "미정",
                req.targetAudience() != null ? req.targetAudience() : "일반 소비자"
        );
    }

    private String buildSystemPrompt(String tone) {
        String toneGuide = switch (tone) {
            case "casual" -> "친근하고 재미있는 어투로, 젊은 층에게 어필하는 스타일";
            case "luxury" -> "고급스럽고 세련된 어투로, 프리미엄 가치를 강조하는 스타일";
            default -> "전문적이고 신뢰감 있는 어투로, 상품의 실용성을 강조하는 스타일";
        };

        return """
                당신은 한국 이커머스 플랫폼의 전문 상품 카피라이터입니다.
                어투: %s

                반드시 다음 JSON 형식으로만 응답하세요:
                {
                  "shortDescription": "30자 이내 한 줄 설명",
                  "fullDescription": "200~300자 상세 설명 (2~3 단락)",
                  "sellingPoint": "핵심 판매 포인트 한 문장",
                  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
                }

                규칙:
                - 과장 광고 금지, 사실에 기반한 설명
                - SEO를 고려한 자연스러운 키워드 포함
                - 소비자 구매 욕구를 자극하는 언어 선택
                - 한국어로 응답
                """.formatted(toneGuide);
    }
}
