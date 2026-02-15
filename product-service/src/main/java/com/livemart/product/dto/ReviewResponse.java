package com.livemart.product.dto;

import com.livemart.product.domain.Review;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Builder
@AllArgsConstructor
public class ReviewResponse {

    private Long id;
    private Long productId;
    private Long userId;
    private String userName;
    private Integer rating;
    private String title;
    private String content;
    private String imageUrls;
    private Integer helpfulCount;
    private Boolean verified;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ReviewResponse from(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProductId())
                .userId(review.getUserId())
                .userName(review.getUserName())
                .rating(review.getRating())
                .title(review.getTitle())
                .content(review.getContent())
                .imageUrls(review.getImageUrls())
                .helpfulCount(review.getHelpfulCount())
                .verified(review.getVerified())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ReviewSummary {
        private Double averageRating;
        private Long totalCount;
        private Map<Integer, Long> ratingDistribution;
    }
}
