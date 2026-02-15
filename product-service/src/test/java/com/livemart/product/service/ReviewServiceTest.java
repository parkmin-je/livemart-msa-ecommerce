package com.livemart.product.service;

import com.livemart.product.domain.Review;
import com.livemart.product.dto.ReviewRequest;
import com.livemart.product.dto.ReviewResponse;
import com.livemart.product.repository.ProductRepository;
import com.livemart.product.repository.ReviewRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewService 단위 테스트")
class ReviewServiceTest {

    @InjectMocks
    private ReviewService reviewService;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ProductRepository productRepository;

    @Nested
    @DisplayName("리뷰 작성")
    class CreateReviewTest {

        @Test
        @DisplayName("리뷰 정상 생성")
        void createReview_success() {
            given(productRepository.existsById(1L)).willReturn(true);
            given(reviewRepository.existsByProductIdAndUserId(1L, 10L)).willReturn(false);
            given(reviewRepository.save(any(Review.class))).willAnswer(inv -> inv.getArgument(0));

            ReviewRequest request = ReviewRequest.builder()
                    .userId(10L)
                    .userName("홍길동")
                    .rating(5)
                    .title("최고의 상품!")
                    .content("품질이 정말 좋습니다")
                    .build();

            ReviewResponse response = reviewService.createReview(1L, request);

            assertThat(response.getRating()).isEqualTo(5);
            assertThat(response.getTitle()).isEqualTo("최고의 상품!");
            assertThat(response.getUserName()).isEqualTo("홍길동");
        }

        @Test
        @DisplayName("존재하지 않는 상품에 리뷰 작성 시 예외")
        void createReview_productNotFound() {
            given(productRepository.existsById(999L)).willReturn(false);

            ReviewRequest request = ReviewRequest.builder().userId(10L).build();

            assertThatThrownBy(() -> reviewService.createReview(999L, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("상품을 찾을 수 없습니다");
        }

        @Test
        @DisplayName("중복 리뷰 작성 시 예외")
        void createReview_duplicate() {
            given(productRepository.existsById(1L)).willReturn(true);
            given(reviewRepository.existsByProductIdAndUserId(1L, 10L)).willReturn(true);

            ReviewRequest request = ReviewRequest.builder().userId(10L).build();

            assertThatThrownBy(() -> reviewService.createReview(1L, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("이미 이 상품에 리뷰를 작성");
        }
    }

    @Nested
    @DisplayName("리뷰 수정/삭제")
    class UpdateDeleteTest {

        @Test
        @DisplayName("본인 리뷰 수정 성공")
        void updateReview_success() {
            Review review = Review.builder()
                    .id(1L).productId(1L).userId(10L).userName("홍길동")
                    .rating(3).title("보통").content("그럭저럭").build();

            given(reviewRepository.findById(1L)).willReturn(Optional.of(review));

            ReviewRequest request = ReviewRequest.builder()
                    .rating(5).title("수정: 최고!").content("다시 써봤는데 좋아요").build();

            ReviewResponse response = reviewService.updateReview(1L, 10L, request);

            assertThat(response.getRating()).isEqualTo(5);
            assertThat(response.getTitle()).isEqualTo("수정: 최고!");
        }

        @Test
        @DisplayName("타인 리뷰 수정 시 예외")
        void updateReview_notOwner() {
            Review review = Review.builder().id(1L).userId(10L).build();
            given(reviewRepository.findById(1L)).willReturn(Optional.of(review));

            ReviewRequest request = ReviewRequest.builder().build();

            assertThatThrownBy(() -> reviewService.updateReview(1L, 99L, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("본인의 리뷰만");
        }

        @Test
        @DisplayName("타인 리뷰 삭제 시 예외")
        void deleteReview_notOwner() {
            Review review = Review.builder().id(1L).userId(10L).build();
            given(reviewRepository.findById(1L)).willReturn(Optional.of(review));

            assertThatThrownBy(() -> reviewService.deleteReview(1L, 99L))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    @DisplayName("리뷰 조회")
    class QueryTest {

        @Test
        @DisplayName("상품별 리뷰 목록 조회")
        void getProductReviews_success() {
            List<Review> reviews = List.of(
                    Review.builder().id(1L).productId(1L).userId(10L).userName("사용자1")
                            .rating(5).title("좋아요").build(),
                    Review.builder().id(2L).productId(1L).userId(20L).userName("사용자2")
                            .rating(4).title("괜찮아요").build()
            );

            given(reviewRepository.findByProductIdOrderByCreatedAtDesc(eq(1L), any()))
                    .willReturn(new PageImpl<>(reviews));

            Page<ReviewResponse> result = reviewService.getProductReviews(1L, PageRequest.of(0, 10));

            assertThat(result.getContent()).hasSize(2);
        }

        @Test
        @DisplayName("리뷰 평점 요약 조회")
        void getReviewSummary_success() {
            given(reviewRepository.findAverageRatingByProductId(1L)).willReturn(4.3);
            given(reviewRepository.countByProductId(1L)).willReturn(15L);
            given(reviewRepository.findRatingDistribution(1L)).willReturn(List.of(
                    new Object[]{5, 8L}, new Object[]{4, 4L}, new Object[]{3, 2L}, new Object[]{2, 1L}
            ));

            ReviewResponse.ReviewSummary summary = reviewService.getReviewSummary(1L);

            assertThat(summary.getAverageRating()).isEqualTo(4.3);
            assertThat(summary.getTotalCount()).isEqualTo(15L);
            assertThat(summary.getRatingDistribution().get(5)).isEqualTo(8L);
        }
    }

    @Test
    @DisplayName("도움됨 표시")
    void markHelpful_success() {
        Review review = Review.builder().id(1L).helpfulCount(5).build();
        given(reviewRepository.findById(1L)).willReturn(Optional.of(review));

        reviewService.markHelpful(1L);

        assertThat(review.getHelpfulCount()).isEqualTo(6);
    }
}
