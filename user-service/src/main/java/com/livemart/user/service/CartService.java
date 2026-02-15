package com.livemart.user.service;

import com.livemart.user.domain.CartItem;
import com.livemart.user.dto.CartRequest;
import com.livemart.user.dto.CartResponse;
import com.livemart.user.repository.CartItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartService {

    private final CartItemRepository cartItemRepository;

    @Transactional
    public CartResponse addToCart(Long userId, CartRequest request) {
        // 이미 장바구니에 있으면 수량 추가
        var existing = cartItemRepository.findByUserIdAndProductId(userId, request.getProductId());
        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.addQuantity(request.getQuantity());
            log.info("장바구니 수량 추가: userId={}, productId={}, qty={}", userId, request.getProductId(), item.getQuantity());
            return CartResponse.from(item);
        }

        CartItem item = CartItem.builder()
                .userId(userId)
                .productId(request.getProductId())
                .productName(request.getProductName())
                .productPrice(request.getProductPrice())
                .productImageUrl(request.getProductImageUrl())
                .quantity(request.getQuantity())
                .build();

        item = cartItemRepository.save(item);
        log.info("장바구니 추가: userId={}, productId={}", userId, request.getProductId());
        return CartResponse.from(item);
    }

    @Transactional
    public CartResponse updateCartItemQuantity(Long userId, Long productId, int quantity) {
        CartItem item = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new IllegalArgumentException("장바구니에 해당 상품이 없습니다"));
        item.updateQuantity(quantity);
        log.info("장바구니 수량 변경: userId={}, productId={}, qty={}", userId, productId, quantity);
        return CartResponse.from(item);
    }

    @Transactional
    public void removeFromCart(Long userId, Long productId) {
        cartItemRepository.deleteByUserIdAndProductId(userId, productId);
        log.info("장바구니 삭제: userId={}, productId={}", userId, productId);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
        log.info("장바구니 전체 삭제: userId={}", userId);
    }

    public CartResponse.CartSummary getCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<CartResponse> responses = items.stream().map(CartResponse::from).toList();

        int totalItems = items.stream().mapToInt(CartItem::getQuantity).sum();
        BigDecimal totalAmount = items.stream()
                .map(CartItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.CartSummary.builder()
                .items(responses)
                .totalItems(totalItems)
                .totalAmount(totalAmount)
                .build();
    }

    public Integer getCartItemCount(Long userId) {
        return cartItemRepository.countByUserId(userId);
    }
}
