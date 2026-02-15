package com.livemart.product.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews", indexes = {
    @Index(name = "idx_review_product", columnList = "productId"),
    @Index(name = "idx_review_user", columnList = "userId"),
    @Index(name = "idx_review_rating", columnList = "rating")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_review_product_user", columnNames = {"productId", "userId"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String userName;

    @Column(nullable = false)
    private Integer rating; // 1~5

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(length = 1000)
    private String imageUrls; // comma-separated

    @Builder.Default
    private Integer helpfulCount = 0;

    @Builder.Default
    private Boolean verified = false; // 구매 확인 리뷰

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public void update(String title, String content, Integer rating, String imageUrls) {
        this.title = title;
        this.content = content;
        this.rating = rating;
        this.imageUrls = imageUrls;
    }

    public void incrementHelpful() {
        this.helpfulCount++;
    }

    public void markVerified() {
        this.verified = true;
    }
}
