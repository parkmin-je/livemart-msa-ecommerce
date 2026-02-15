package com.livemart.product.service;

import com.livemart.product.domain.Review;
import com.livemart.product.dto.ReviewRequest;
import com.livemart.product.dto.ReviewResponse;
import com.livemart.product.repository.ProductRepository;
import com.livemart.product.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;

    @Transactional
    public ReviewResponse createReview(Long productId, ReviewRequest request) {
        if (!productRepository.existsById(productId)) {
            throw new IllegalArgumentException("상품을 찾을 수 없습니다: " + productId);
        }

        if (reviewRepository.existsByProductIdAndUserId(productId, request.getUserId())) {
            throw new IllegalStateException("이미 이 상품에 리뷰를 작성하셨습니다");
        }

        Review review = Review.builder()
                .productId(productId)
                .userId(request.getUserId())
                .userName(request.getUserName())
                .rating(request.getRating())
                .title(request.getTitle())
                .content(request.getContent())
                .imageUrls(request.getImageUrls())
                .build();

        review = reviewRepository.save(review);
        log.info("리뷰 생성: productId={}, userId={}, rating={}", productId, request.getUserId(), request.getRating());
        return ReviewResponse.from(review);
    }

    @Transactional
    public ReviewResponse updateReview(Long reviewId, Long userId, ReviewRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다"));

        if (!review.getUserId().equals(userId)) {
            throw new IllegalStateException("본인의 리뷰만 수정할 수 있습니다");
        }

        review.update(request.getTitle(), request.getContent(), request.getRating(), request.getImageUrls());
        log.info("리뷰 수정: reviewId={}", reviewId);
        return ReviewResponse.from(review);
    }

    @Transactional
    public void deleteReview(Long reviewId, Long userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다"));

        if (!review.getUserId().equals(userId)) {
            throw new IllegalStateException("본인의 리뷰만 삭제할 수 있습니다");
        }

        reviewRepository.delete(review);
        log.info("리뷰 삭제: reviewId={}", reviewId);
    }

    public Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable)
                .map(ReviewResponse::from);
    }

    public Page<ReviewResponse> getUserReviews(Long userId, Pageable pageable) {
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(ReviewResponse::from);
    }

    public ReviewResponse.ReviewSummary getReviewSummary(Long productId) {
        Double avgRating = reviewRepository.findAverageRatingByProductId(productId);
        Long totalCount = reviewRepository.countByProductId(productId);

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            distribution.put(i, 0L);
        }
        reviewRepository.findRatingDistribution(productId).forEach(row -> {
            Integer rating = (Integer) row[0];
            Long count = (Long) row[1];
            distribution.put(rating, count);
        });

        return ReviewResponse.ReviewSummary.builder()
                .averageRating(avgRating != null ? Math.round(avgRating * 10) / 10.0 : 0.0)
                .totalCount(totalCount)
                .ratingDistribution(distribution)
                .build();
    }

    @Transactional
    public void markHelpful(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다"));
        review.incrementHelpful();
    }
}
