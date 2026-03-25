package com.livemart.user.controller;

import com.livemart.user.dto.CartRequest;
import com.livemart.user.dto.CartResponse;
import com.livemart.user.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
            @Valid @RequestBody CartRequest request,
            Authentication auth) {
        validateUserAccess(userId, auth);
        return ResponseEntity.ok(cartService.addToCart(userId, request));
    }

    @Operation(summary = "장바구니 조회")
    @GetMapping
    public ResponseEntity<CartResponse.CartSummary> getCart(
            @PathVariable Long userId,
            Authentication auth) {
        validateUserAccess(userId, auth);
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    @Operation(summary = "장바구니 수량 변경")
    @PutMapping("/{productId}")
    public ResponseEntity<CartResponse> updateQuantity(
            @PathVariable Long userId,
            @PathVariable Long productId,
            @RequestParam int quantity,
            Authentication auth) {
        validateUserAccess(userId, auth);
        return ResponseEntity.ok(cartService.updateCartItemQuantity(userId, productId, quantity));
    }

    @Operation(summary = "장바구니 상품 삭제")
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFromCart(
            @PathVariable Long userId,
            @PathVariable Long productId,
            Authentication auth) {
        validateUserAccess(userId, auth);
        cartService.removeFromCart(userId, productId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "장바구니 전체 삭제")
    @DeleteMapping
    public ResponseEntity<Void> clearCart(
            @PathVariable Long userId,
            Authentication auth) {
        validateUserAccess(userId, auth);
        cartService.clearCart(userId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "장바구니 상품 수 조회")
    @GetMapping("/count")
    public ResponseEntity<Integer> getCartItemCount(
            @PathVariable Long userId,
            Authentication auth) {
        validateUserAccess(userId, auth);
        return ResponseEntity.ok(cartService.getCartItemCount(userId));
    }

    // ── 보안 헬퍼 ───────────────────────────────────────────────────

    private void validateUserAccess(Long userId, Authentication auth) {
        Long currentUserId = extractCurrentUserId(auth);
        if (!userId.equals(currentUserId) && !isAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다");
        }
    }

    private Long extractCurrentUserId(Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof Long) return (Long) principal;
        if (principal instanceof String) return Long.parseLong((String) principal);
        return Long.parseLong(auth.getName());
    }

    private boolean isAdmin(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
