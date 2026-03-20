package com.livemart.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellerAgentRequest {
    @NotBlank private String category;
    @NotBlank private String productName;
    private String keywords;
    private String targetAudience;
    private Long sellerId;
    private String priceRange; // e.g., "10000-50000"
}
