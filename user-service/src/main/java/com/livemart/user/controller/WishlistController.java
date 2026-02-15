package com.livemart.user.controller;

import com.livemart.user.dto.WishlistRequest;
import com.livemart.user.dto.WishlistResponse;
import com.livemart.user.service.WishlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Wishlist API", description = "위시리스트 관리 API")
@RestController
@RequestMapping("/api/users/{userId}/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @Operation(summary = "위시리스트 추가")
    @PostMapping
    public ResponseEntity<WishlistResponse> addToWishlist(
            @PathVariable Long userId,
            @Valid @RequestBody WishlistRequest request) {
        return ResponseEntity.ok(wishlistService.addToWishlist(userId, request));
    }

    @Operation(summary = "위시리스트 조회")
    @GetMapping
    public ResponseEntity<List<WishlistResponse>> getWishlist(@PathVariable Long userId) {
        return ResponseEntity.ok(wishlistService.getWishlist(userId));
    }

    @Operation(summary = "위시리스트 삭제")
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFromWishlist(
            @PathVariable Long userId,
            @PathVariable Long productId) {
        wishlistService.removeFromWishlist(userId, productId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "위시리스트 여부 확인")
    @GetMapping("/{productId}/check")
    public ResponseEntity<Boolean> isInWishlist(
            @PathVariable Long userId,
            @PathVariable Long productId) {
        return ResponseEntity.ok(wishlistService.isInWishlist(userId, productId));
    }

    @Operation(summary = "위시리스트 수 조회")
    @GetMapping("/count")
    public ResponseEntity<Integer> getWishlistCount(@PathVariable Long userId) {
        return ResponseEntity.ok(wishlistService.getWishlistCount(userId));
    }
}
