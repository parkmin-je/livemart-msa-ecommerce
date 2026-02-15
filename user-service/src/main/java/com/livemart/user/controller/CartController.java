package com.livemart.user.controller;

import com.livemart.user.dto.CartRequest;
import com.livemart.user.dto.CartResponse;
import com.livemart.user.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Cart API", description = "장바구니 관리 API")
@RestController
@RequestMapping("/api/users/{userId}/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @Operation(summary = "장바구니 추가")
    @PostMapping
    public ResponseEntity<CartResponse> addToCart(
            @PathVariable Long userId,
            @Valid @RequestBody CartRequest request) {
        return ResponseEntity.ok(cartService.addToCart(userId, request));
    }

    @Operation(summary = "장바구니 조회")
    @GetMapping
    public ResponseEntity<CartResponse.CartSummary> getCart(@PathVariable Long userId) {
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    @Operation(summary = "장바구니 수량 변경")
    @PutMapping("/{productId}")
    public ResponseEntity<CartResponse> updateQuantity(
            @PathVariable Long userId,
            @PathVariable Long productId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(cartService.updateCartItemQuantity(userId, productId, quantity));
    }

    @Operation(summary = "장바구니 상품 삭제")
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFromCart(
            @PathVariable Long userId,
            @PathVariable Long productId) {
        cartService.removeFromCart(userId, productId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "장바구니 전체 삭제")
    @DeleteMapping
    public ResponseEntity<Void> clearCart(@PathVariable Long userId) {
        cartService.clearCart(userId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "장바구니 상품 수 조회")
    @GetMapping("/count")
    public ResponseEntity<Integer> getCartItemCount(@PathVariable Long userId) {
        return ResponseEntity.ok(cartService.getCartItemCount(userId));
    }
}
