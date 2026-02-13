package com.livemart.product.search;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.aggregations.Aggregation;
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import com.livemart.product.dto.ProductResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Elasticsearch 고급 검색 서비스
 * Fuzzy Search, Aggregation, Autocomplete 지원
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdvancedSearchService {

    private final ElasticsearchClient elasticsearchClient;
    private static final String INDEX_NAME = "products";

    /**
     * Fuzzy Search - 오타 허용 검색
     */
    public List<ProductResponse> fuzzySearch(String keyword, int fuzziness) {
        try {
            Query fuzzyQuery = new Query.Builder()
                .multiMatch(m -> m
                    .query(keyword)
                    .fields("name^3", "description^2", "category.name")
                    .fuzziness(String.valueOf(fuzziness))
                    .prefixLength(1)
                )
                .build();

            SearchRequest request = SearchRequest.of(s -> s
                .index(INDEX_NAME)
                .query(fuzzyQuery)
                .size(50)
            );

            SearchResponse<Map> response = elasticsearchClient.search(request, Map.class);

            return response.hits().hits().stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Fuzzy search failed: keyword={}", keyword, e);
            return Collections.emptyList();
        }
    }

    /**
     * 고급 필터 검색 - 가격, 카테고리, 평점 등
     */
    public List<ProductResponse> advancedSearch(SearchCriteria criteria) {
        try {
            List<Query> mustQueries = new ArrayList<>();

            // 키워드 검색 (Match + Boost)
            if (criteria.getKeyword() != null) {
                mustQueries.add(Query.of(q -> q
                    .multiMatch(m -> m
                        .query(criteria.getKeyword())
                        .fields("name^3", "description^2")
                        .type(TextQueryType.BestFields)
                        .fuzziness("AUTO")
                    )
                ));
            }

            // 가격 범위
            if (criteria.getMinPrice() != null || criteria.getMaxPrice() != null) {
                mustQueries.add(Query.of(q -> q
                    .range(r -> {
                        var rangeQuery = r.field("price");
                        if (criteria.getMinPrice() != null) {
                            rangeQuery.gte(co.elastic.clients.json.JsonData.of(criteria.getMinPrice().doubleValue()));
                        }
                        if (criteria.getMaxPrice() != null) {
                            rangeQuery.lte(co.elastic.clients.json.JsonData.of(criteria.getMaxPrice().doubleValue()));
                        }
                        return rangeQuery;
                    })
                ));
            }

            // 카테고리 필터
            if (criteria.getCategoryId() != null) {
                mustQueries.add(Query.of(q -> q
                    .term(t -> t
                        .field("categoryId")
                        .value(criteria.getCategoryId())
                    )
                ));
            }

            // 재고 있는 상품만
            if (criteria.isInStockOnly()) {
                mustQueries.add(Query.of(q -> q
                    .range(r -> r
                        .field("stockQuantity")
                        .gt(co.elastic.clients.json.JsonData.of(0.0))
                    )
                ));
            }

            BoolQuery boolQuery = BoolQuery.of(b -> b.must(mustQueries));

            SearchRequest request = SearchRequest.of(s -> s
                .index(INDEX_NAME)
                .query(q -> q.bool(boolQuery))
                .from(criteria.getPage() * criteria.getSize())
                .size(criteria.getSize())
                .sort(so -> so
                    .field(f -> f
                        .field(criteria.getSortBy())
                        .order(criteria.getSortOrder())
                    )
                )
            );

            SearchResponse<Map> response = elasticsearchClient.search(request, Map.class);

            return response.hits().hits().stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Advanced search failed: criteria={}", criteria, e);
            return Collections.emptyList();
        }
    }

    /**
     * Aggregation - 카테고리별 상품 수, 가격 통계
     */
    public Map<String, Object> getAggregations() {
        try {
            SearchRequest request = SearchRequest.of(s -> s
                .index(INDEX_NAME)
                .size(0)
                .aggregations("categories", Aggregation.of(a -> a
                    .terms(t -> t.field("categoryId"))
                ))
                .aggregations("price_stats", Aggregation.of(a -> a
                    .stats(st -> st.field("price"))
                ))
                .aggregations("price_ranges", Aggregation.of(a -> a
                    .range(r -> r
                        .field("price")
                        .ranges(ra -> ra.to(String.valueOf(10000.0)))
                        .ranges(ra -> ra.from(String.valueOf(10000.0)).to(String.valueOf(50000.0)))
                        .ranges(ra -> ra.from(String.valueOf(50000.0)))
                    )
                ))
            );

            SearchResponse<Map> response = elasticsearchClient.search(request, Map.class);

            Map<String, Object> aggregations = new HashMap<>();
            response.aggregations().forEach((key, value) -> {
                aggregations.put(key, value);
            });

            return aggregations;

        } catch (Exception e) {
            log.error("Aggregation failed", e);
            return Collections.emptyMap();
        }
    }

    /**
     * Autocomplete - 검색어 자동완성
     */
    public List<String> autocomplete(String prefix) {
        try {
            Query prefixQuery = Query.of(q -> q
                .prefix(p -> p
                    .field("name.keyword")
                    .value(prefix)
                )
            );

            SearchRequest request = SearchRequest.of(s -> s
                .index(INDEX_NAME)
                .query(prefixQuery)
                .size(10)
                .source(so -> so
                    .filter(f -> f
                        .includes("name")
                    )
                )
            );

            SearchResponse<Map> response = elasticsearchClient.search(request, Map.class);

            return response.hits().hits().stream()
                .map(hit -> (String) hit.source().get("name"))
                .distinct()
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Autocomplete failed: prefix={}", prefix, e);
            return Collections.emptyList();
        }
    }

    /**
     * 유사 상품 추천 (More Like This)
     */
    public List<ProductResponse> getRelatedProducts(Long productId, int size) {
        try {
            Query moreLikeThisQuery = Query.of(q -> q
                .moreLikeThis(m -> m
                    .fields("name", "description", "category.name")
                    .like(l -> l.document(d -> d
                        .index(INDEX_NAME)
                        .id(productId.toString())
                    ))
                    .minTermFreq(1)
                    .maxQueryTerms(12)
                )
            );

            SearchRequest request = SearchRequest.of(s -> s
                .index(INDEX_NAME)
                .query(moreLikeThisQuery)
                .size(size)
            );

            SearchResponse<Map> response = elasticsearchClient.search(request, Map.class);

            return response.hits().hits().stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Related products search failed: productId={}", productId, e);
            return Collections.emptyList();
        }
    }

    private ProductResponse mapToProductResponse(Hit<Map> hit) {
        Map<String, Object> source = hit.source();
        return ProductResponse.builder()
            .id(Long.valueOf(hit.id()))
            .name((String) source.get("name"))
            .description((String) source.get("description"))
            .price(new BigDecimal(source.get("price").toString()))
            .stockQuantity((Integer) source.get("stockQuantity"))
            .build();
    }
}
