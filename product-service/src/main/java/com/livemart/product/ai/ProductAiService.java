package com.livemart.product.ai;

import com.livemart.product.domain.Product;
import com.livemart.product.repository.ProductRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@ConditionalOnBean(ChatModel.class)
public class ProductAiService {

    private final ChatModel chatModel;
    private final ProductRepository productRepository;

    public ProductAiService(ChatModel chatModel, ProductRepository productRepository) {
        this.chatModel = chatModel;
        this.productRepository = productRepository;
        log.info("Spring AI enabled - ProductAiService initialized");
    }

    public String searchWithAi(String userQuery) {
        List<Product> products = productRepository.findAll();
        String productCatalog = products.stream()
                .limit(50)
                .map(p -> String.format("- [ID:%d] %s (₩%s) - %s",
                        p.getId(), p.getName(), p.getPrice(), p.getDescription()))
                .collect(Collectors.joining("\n"));

        String prompt = """
                당신은 LiveMart 쇼핑몰의 상품 검색 AI 어시스턴트입니다.
                사용자의 검색 의도를 파악하여 가장 적합한 상품을 추천해주세요.

                [상품 목록]
                %s

                [사용자 검색어]
                %s

                JSON 형식으로 추천 상품 ID 목록과 추천 이유를 반환해주세요:
                {"recommendations": [{"productId": 1, "reason": "추천 이유"}], "summary": "검색 요약"}
                """.formatted(productCatalog, userQuery);

        return ChatClient.create(chatModel)
                .prompt()
                .user(prompt)
                .call()
                .content();
    }

    public String getRecommendations(Long userId, List<Long> recentProductIds) {
        List<Product> recentProducts = productRepository.findAllById(recentProductIds);
        List<Product> allProducts = productRepository.findAll();

        String viewedProducts = recentProducts.stream()
                .map(p -> String.format("- %s (카테고리: %s, 가격: ₩%s)",
                        p.getName(),
                        p.getCategory() != null ? p.getCategory().getName() : "미분류",
                        p.getPrice()))
                .collect(Collectors.joining("\n"));

        String catalog = allProducts.stream()
                .filter(p -> !recentProductIds.contains(p.getId()))
                .limit(50)
                .map(p -> String.format("- [ID:%d] %s (카테고리: %s, 가격: ₩%s)",
                        p.getId(), p.getName(),
                        p.getCategory() != null ? p.getCategory().getName() : "미분류",
                        p.getPrice()))
                .collect(Collectors.joining("\n"));

        String prompt = """
                당신은 LiveMart 쇼핑몰의 개인화 추천 AI입니다.
                사용자의 최근 관심 상품을 분석하여 취향에 맞는 상품을 추천해주세요.

                [사용자가 최근 본 상품]
                %s

                [추천 가능한 상품 목록]
                %s

                JSON 형식으로 5개 이하의 추천 상품을 반환해주세요:
                {"recommendations": [{"productId": 1, "reason": "추천 이유", "score": 0.95}]}
                """.formatted(viewedProducts, catalog);

        return ChatClient.create(chatModel)
                .prompt()
                .user(prompt)
                .call()
                .content();
    }

    public String chat(String userMessage, String conversationContext) {
        String systemPrompt = """
                당신은 LiveMart 쇼핑몰의 AI 고객 상담 챗봇입니다.
                상품 문의, 주문 상태, 배송 정보, 교환/환불 등의 질문에 친절하게 답변해주세요.
                한국어로 답변하며, 전문적이면서도 친근한 톤을 유지하세요.
                """;

        String prompt = conversationContext != null
                ? "[이전 대화]\n" + conversationContext + "\n\n[새 메시지]\n" + userMessage
                : userMessage;

        return ChatClient.create(chatModel)
                .prompt()
                .system(systemPrompt)
                .user(prompt)
                .call()
                .content();
    }
}
