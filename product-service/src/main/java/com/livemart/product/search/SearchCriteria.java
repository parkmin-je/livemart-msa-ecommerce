package com.livemart.product.search;

import co.elastic.clients.elasticsearch._types.SortOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 검색 조건 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchCriteria {
    private String keyword;
    private Long categoryId;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private boolean inStockOnly;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private SortOrder sortOrder = SortOrder.Desc;

    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;
}
