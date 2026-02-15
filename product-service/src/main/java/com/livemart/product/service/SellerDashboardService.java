package com.livemart.product.service;

import com.livemart.product.domain.Product;
import com.livemart.product.domain.ProductStatus;
import com.livemart.product.dto.SellerDashboardResponse;
import com.livemart.product.repository.ProductRepository;
import com.livemart.product.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerDashboardService {

    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;

    public SellerDashboardResponse getDashboard(Long sellerId) {
        List<Product> products = productRepository.findBySellerId(sellerId, PageRequest.of(0, 1000)).getContent();

        int totalProducts = products.size();
        int activeProducts = (int) products.stream()
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE).count();
        int outOfStockProducts = (int) products.stream()
                .filter(p -> p.getStockQuantity() <= 0).count();

        BigDecimal totalRevenue = products.stream()
                .map(p -> p.getPrice().multiply(BigDecimal.valueOf(100 - p.getStockQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 카테고리 분포
        Map<String, Integer> categoryDistribution = products.stream()
                .filter(p -> p.getCategory() != null)
                .collect(Collectors.groupingBy(
                        p -> p.getCategory().getName(),
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));

        // 상품별 리뷰 정보
        List<SellerDashboardResponse.ProductSummary> topProducts = products.stream()
                .sorted(Comparator.comparing(Product::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(product -> {
                    Double avgRating = reviewRepository.findAverageRatingByProductId(product.getId());
                    Long reviewCount = reviewRepository.countByProductId(product.getId());

                    return SellerDashboardResponse.ProductSummary.builder()
                            .id(product.getId())
                            .name(product.getName())
                            .price(product.getPrice())
                            .stockQuantity(product.getStockQuantity())
                            .status(product.getStatus().name())
                            .averageRating(avgRating != null ? avgRating : 0.0)
                            .reviewCount(reviewCount)
                            .build();
                })
                .toList();

        // 전체 평균 평점
        double overallAvgRating = topProducts.stream()
                .filter(p -> p.getAverageRating() > 0)
                .mapToDouble(SellerDashboardResponse.ProductSummary::getAverageRating)
                .average().orElse(0.0);

        long totalReviews = topProducts.stream()
                .mapToLong(SellerDashboardResponse.ProductSummary::getReviewCount)
                .sum();

        return SellerDashboardResponse.builder()
                .sellerId(sellerId)
                .totalProducts(totalProducts)
                .activeProducts(activeProducts)
                .outOfStockProducts(outOfStockProducts)
                .totalRevenue(totalRevenue)
                .averageRating(Math.round(overallAvgRating * 10) / 10.0)
                .totalReviews(totalReviews)
                .topProducts(topProducts)
                .categoryDistribution(categoryDistribution)
                .build();
    }
}
