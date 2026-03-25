package com.livemart.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.ai.client.OpenAiClient;
import com.livemart.ai.dto.RecommendationRequest;
import com.livemart.ai.dto.RecommendationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 상품 벡터 스토어 서비스 (Spring AI VectorStore 패턴 구현)
 *
 * Spring AI 1.0.0 의존성 없이 동일한 RAG(Retrieval Augmented Generation) 패턴을 구현.
 * - 상품 설명 → OpenAI Embedding API → 벡터 생성
 * - Redis Hash에 상품 메타데이터 + 벡터 저장
 * - 코사인 유사도 계산으로 유사 상품 검색
 * - RAG 패턴: 유사 상품 컨텍스트를 LLM 프롬프트에 주입
 *
 * Spring AI 정식 통합 시 이 클래스를 아래와 같이 대체:
 *   @Autowired VectorStore vectorStore;
 *   vectorStore.add(List.of(new Document(content, metadata)));
 *   List<Document> results = vectorStore.similaritySearch(query);
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductVectorStoreService {

    private static final String VECTOR_PREFIX = "product:vector:";
    private static final String META_PREFIX = "product:meta:";
    private static final String INDEX_KEY = "product:index";
    private static final Duration VECTOR_TTL = Duration.ofHours(24);
    private static final int EMBEDDING_DIMENSION = 1536; // text-embedding-3-small

    private final OpenAiClient openAiClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 상품 정보를 벡터로 임베딩하여 Redis에 저장 (VectorStore.add() 패턴)
     *
     * @param productId  상품 ID
     * @param name       상품명
     * @param description 상품 설명
     * @param category   카테고리
     * @param price      가격
     */
    public void indexProduct(Long productId, String name, String description,
                             String category, double price) {
        try {
            // 임베딩 텍스트 구성 (청크 분할 생략 - 짧은 상품 설명 가정)
            String content = String.format(
                "상품명: %s\n카테고리: %s\n가격: %.0f원\n설명: %s",
                name, category, price, description
            );

            // OpenAI Embedding API 호출 (실제 벡터 생성)
            double[] embedding = openAiClient.createEmbedding(content);

            if (embedding == null || embedding.length == 0) {
                log.warn("상품 {} 임베딩 생성 실패 - 데모 벡터 사용", productId);
                embedding = generateDemoVector(productId);
            }

            // 메타데이터 저장 (Redis Hash)
            Map<String, Object> meta = new HashMap<>();
            meta.put("id", productId);
            meta.put("name", name);
            meta.put("description", description);
            meta.put("category", category);
            meta.put("price", price);

            String metaKey = META_PREFIX + productId;
            redisTemplate.opsForHash().putAll(metaKey, meta);
            redisTemplate.expire(metaKey, VECTOR_TTL);

            // 벡터 저장 (JSON 직렬화)
            String vectorKey = VECTOR_PREFIX + productId;
            redisTemplate.opsForValue().set(
                vectorKey,
                objectMapper.writeValueAsString(embedding),
                VECTOR_TTL
            );

            // 전체 상품 인덱스에 추가
            redisTemplate.opsForSet().add(INDEX_KEY, productId.toString());

            log.info("상품 {} 벡터 인덱싱 완료 (dimension={})", productId, embedding.length);

        } catch (Exception e) {
            log.error("상품 {} 벡터 인덱싱 실패: {}", productId, e.getMessage());
        }
    }

    /**
     * 쿼리 텍스트와 유사한 상품 검색 (VectorStore.similaritySearch() 패턴)
     *
     * @param query     검색 쿼리
     * @param topK      반환할 상위 K개
     * @param threshold 최소 유사도 임계값 (0~1)
     * @return 유사 상품 목록 (유사도 내림차순)
     */
    public List<SimilarProduct> similaritySearch(String query, int topK, double threshold) {
        try {
            // 쿼리 임베딩 생성
            double[] queryVector = openAiClient.createEmbedding(query);
            if (queryVector == null || queryVector.length == 0) {
                log.warn("쿼리 임베딩 생성 실패, 빈 결과 반환");
                return Collections.emptyList();
            }

            // 전체 상품 인덱스 조회
            Set<Object> productIds = redisTemplate.opsForSet().members(INDEX_KEY);
            if (productIds == null || productIds.isEmpty()) {
                return Collections.emptyList();
            }

            // 코사인 유사도 계산 (실제 운영에서는 Redis Vector Search 또는 OpenSearch 사용)
            List<SimilarProduct> results = new ArrayList<>();

            for (Object productIdObj : productIds) {
                try {
                    Long productId = Long.parseLong(productIdObj.toString());
                    String vectorKey = VECTOR_PREFIX + productId;

                    Object vectorJson = redisTemplate.opsForValue().get(vectorKey);
                    if (vectorJson == null) continue;

                    double[] productVector = objectMapper.readValue(
                        vectorJson.toString(), double[].class
                    );

                    double similarity = cosineSimilarity(queryVector, productVector);

                    if (similarity >= threshold) {
                        Map<Object, Object> meta = redisTemplate.opsForHash()
                            .entries(META_PREFIX + productId);

                        results.add(SimilarProduct.builder()
                            .productId(productId)
                            .name(safeString(meta.get("name")))
                            .description(safeString(meta.get("description")))
                            .category(safeString(meta.get("category")))
                            .price(safeDouble(meta.get("price")))
                            .similarity(similarity)
                            .build());
                    }
                } catch (Exception e) {
                    log.debug("상품 유사도 계산 실패: {}", e.getMessage());
                }
            }

            // 유사도 내림차순 정렬 후 topK 반환
            results.sort((a, b) -> Double.compare(b.similarity(), a.similarity()));
            return results.stream().limit(topK).toList();

        } catch (Exception e) {
            log.error("유사도 검색 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * RAG 패턴: 유사 상품 컨텍스트를 활용한 개인화 추천
     *
     * 동작 흐름:
     * 1. 사용자 히스토리 기반 임베딩 생성
     * 2. VectorStore에서 유사 상품 검색
     * 3. 검색된 상품 정보를 LLM 프롬프트에 주입
     * 4. LLM이 컨텍스트 기반으로 추천 이유 생성
     */
    public RecommendationResponse ragRecommend(RecommendationRequest request) {
        // 1. 사용자 관심사 기반 쿼리 구성
        String userQuery = buildUserQuery(request);

        // 2. 유사 상품 검색 (VectorStore.similaritySearch)
        List<SimilarProduct> similarProducts = similaritySearch(userQuery, 5, 0.5);

        if (similarProducts.isEmpty()) {
            log.info("유사 상품 없음, 기본 추천으로 폴백");
            return buildDefaultRecommendation(request);
        }

        // 3. 컨텍스트 구성 (RAG - Retrieval Augmented Generation)
        String context = buildProductContext(similarProducts);

        // 4. LLM에 컨텍스트 주입하여 개인화 추천 생성
        String systemPrompt = """
            당신은 LiveMart의 개인화 쇼핑 어시스턴트입니다.
            아래 [관련 상품 컨텍스트]를 참고하여 사용자에게 맞춤 추천을 제공하세요.
            응답은 반드시 JSON 형식으로, 추천 이유를 한국어로 작성하세요.
            """;

        String userPrompt = String.format("""
            [사용자 정보]
            사용자 ID: %s
            최근 구매 상품: %s
            선호 카테고리: %s

            [관련 상품 컨텍스트]
            %s

            위 컨텍스트를 기반으로 3개 상품을 추천하고, 각 추천 이유를 구체적으로 설명해주세요.
            JSON 형식: {"recommendations": [{"productId": "...", "reason": "...", "score": 0.0-1.0}]}
            """,
            request.userId(),
            request.purchasedProductIds() != null ?
                String.join(", ", request.purchasedProductIds().stream().map(Object::toString).toList()) : "없음",
            request.purchasedCategories() != null && !request.purchasedCategories().isEmpty() ?
                String.join(", ", request.purchasedCategories()) : "없음",
            context
        );

        String llmResponse = openAiClient.chatCompletion(systemPrompt, userPrompt);

        return parseRagResponse(llmResponse, similarProducts);
    }

    // ── 내부 헬퍼 ─────────────────────────────────────────────

    private double cosineSimilarity(double[] a, double[] b) {
        if (a.length != b.length) return 0.0;
        double dotProduct = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0.0 || normB == 0.0) return 0.0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private double[] generateDemoVector(Long seed) {
        Random random = new Random(seed);
        double[] vector = new double[EMBEDDING_DIMENSION];
        for (int i = 0; i < vector.length; i++) {
            vector[i] = random.nextGaussian();
        }
        return vector;
    }

    private String buildUserQuery(RecommendationRequest request) {
        StringBuilder sb = new StringBuilder();
        if (request.purchasedCategories() != null && !request.purchasedCategories().isEmpty()) {
            sb.append(String.join(" ", request.purchasedCategories())).append(" ");
        }
        if (request.purchasedProductIds() != null && !request.purchasedProductIds().isEmpty()) {
            sb.append("최근 구매 상품 카테고리 관련 상품");
        }
        return sb.isEmpty() ? "인기 상품 추천" : sb.toString();
    }

    private String buildProductContext(List<SimilarProduct> products) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < products.size(); i++) {
            SimilarProduct p = products.get(i);
            sb.append(String.format(
                "%d. %s (ID:%d) - 카테고리: %s, 가격: %.0f원, 유사도: %.2f\n   설명: %s\n",
                i + 1, p.name(), p.productId(), p.category(), p.price(), p.similarity(),
                p.description() != null ? p.description().substring(0, Math.min(100, p.description().length())) : ""
            ));
        }
        return sb.toString();
    }

    private RecommendationResponse parseRagResponse(String llmResponse, List<SimilarProduct> fallback) {
        try {
            // JSON 파싱 시도
            Map<?, ?> parsed = objectMapper.readValue(llmResponse, Map.class);
            List<?> recs = (List<?>) parsed.get("recommendations");
            if (recs != null && !recs.isEmpty()) {
                List<RecommendationResponse.RecommendedItem> items = new ArrayList<>();
                for (Object rec : recs) {
                    if (rec instanceof Map<?, ?> recMap) {
                        items.add(new RecommendationResponse.RecommendedItem(
                            safeString(recMap.get("productId")),
                            "ai-rag",
                            safeString(recMap.get("reason")),
                            safeDouble(recMap.get("score"))
                        ));
                    }
                }
                return new RecommendationResponse(null, items, "RAG 벡터 검색 기반 추천", false, 0L);
            }
        } catch (Exception e) {
            log.warn("LLM 응답 파싱 실패, 폴백 사용: {}", e.getMessage());
        }

        // 폴백: 유사도 기반 직접 반환
        List<RecommendationResponse.RecommendedItem> items = fallback.stream()
            .map(p -> new RecommendationResponse.RecommendedItem(
                p.productId().toString(),
                p.category(),
                "벡터 유사도 기반 추천 (유사도: " + String.format("%.2f", p.similarity()) + ")",
                p.similarity()
            ))
            .toList();

        return new RecommendationResponse(null, items, "벡터 유사도 폴백", false, 0L);
    }

    private RecommendationResponse buildDefaultRecommendation(RecommendationRequest request) {
        // RecommendationResponse는 record 타입 — 생성자 직접 호출
        return new RecommendationResponse(
            request.userId(),
            List.of(),
            "관련 상품 없음 — 기본 추천",
            false,
            0L
        );
    }

    private String safeString(Object obj) {
        return obj != null ? obj.toString() : "";
    }

    private double safeDouble(Object obj) {
        if (obj == null) return 0.0;
        try { return Double.parseDouble(obj.toString()); }
        catch (NumberFormatException e) { return 0.0; }
    }

    // ── 내부 DTO ──────────────────────────────────────────────

    public record SimilarProduct(
        Long productId,
        String name,
        String description,
        String category,
        double price,
        double similarity
    ) {
        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private Long productId;
            private String name;
            private String description;
            private String category;
            private double price;
            private double similarity;

            public Builder productId(Long v) { productId = v; return this; }
            public Builder name(String v) { name = v; return this; }
            public Builder description(String v) { description = v; return this; }
            public Builder category(String v) { category = v; return this; }
            public Builder price(double v) { price = v; return this; }
            public Builder similarity(double v) { similarity = v; return this; }

            public SimilarProduct build() {
                return new SimilarProduct(productId, name, description, category, price, similarity);
            }
        }
    }
}
