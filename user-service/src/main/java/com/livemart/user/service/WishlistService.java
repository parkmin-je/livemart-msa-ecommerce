package com.livemart.user.service;

import com.livemart.user.domain.Wishlist;
import com.livemart.user.dto.WishlistRequest;
import com.livemart.user.dto.WishlistResponse;
import com.livemart.user.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WishlistService {

    private final WishlistRepository wishlistRepository;

    @Transactional
    public WishlistResponse addToWishlist(Long userId, WishlistRequest request) {
        if (wishlistRepository.existsByUserIdAndProductId(userId, request.getProductId())) {
            throw new IllegalStateException("이미 위시리스트에 추가된 상품입니다");
        }

        Wishlist wishlist = Wishlist.builder()
                .userId(userId)
                .productId(request.getProductId())
                .productName(request.getProductName())
                .productPrice(request.getProductPrice())
                .productImageUrl(request.getProductImageUrl())
                .build();

        wishlist = wishlistRepository.save(wishlist);
        log.info("위시리스트 추가: userId={}, productId={}", userId, request.getProductId());
        return WishlistResponse.from(wishlist);
    }

    @Transactional
    public void removeFromWishlist(Long userId, Long productId) {
        wishlistRepository.deleteByUserIdAndProductId(userId, productId);
        log.info("위시리스트 삭제: userId={}, productId={}", userId, productId);
    }

    public List<WishlistResponse> getWishlist(Long userId) {
        return wishlistRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(WishlistResponse::from)
                .toList();
    }

    public boolean isInWishlist(Long userId, Long productId) {
        return wishlistRepository.existsByUserIdAndProductId(userId, productId);
    }

    public Integer getWishlistCount(Long userId) {
        return wishlistRepository.countByUserId(userId);
    }
}
