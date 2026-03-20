package com.livemart.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchIntentResponse implements java.io.Serializable {
    private String originalQuery;
    private String correctedQuery;
    private String intent;              // CATEGORY / SPECIFIC_PRODUCT / PRICE_COMPARE / GENERAL
    private List<String> expandedKeywords;
    private String suggestedCategory;
    private boolean demoMode;
}
