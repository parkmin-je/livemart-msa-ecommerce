package com.livemart.user.controller;

import com.livemart.user.dto.*;
import com.livemart.user.service.EmailVerificationService;
import com.livemart.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "User API", description = "사용자 관리 API")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final EmailVerificationService emailVerificationService;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<UserResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.signup(request));
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @Operation(summary = "토큰 갱신")
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(userService.refresh(request));
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        userService.logout(userId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "내 정보 조회")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMyProfile(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @Operation(summary = "내 프로필 수정 (온보딩·추가정보)")
    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMyProfile(
            Authentication authentication,
            @RequestBody UpdateProfileRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(userService.updateMyProfile(userId, request));
    }

    @Operation(summary = "사용자 조회")
    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @Operation(summary = "헬스체크")
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("User Service is running");
    }

    // ─── 관리자 전용 ──────────────────────────────────────────────

    @Operation(summary = "전체 사용자 목록 조회 (관리자)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @Operation(summary = "사용자 역할 변경 (관리자)")
    @PutMapping("/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUserRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        String role = body.get("role");
        if (role == null || role.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.updateUserRole(userId, role));
    }

    @Operation(summary = "사용자 비활성화 (관리자)")
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long userId) {
        userService.deactivateUser(userId);
        return ResponseEntity.noContent().build();
    }

    // ─── 이메일 인증 ──────────────────────────────────────────────

    @Operation(summary = "이메일 인증 코드 발송")
    @PostMapping("/email/send")
    public ResponseEntity<Map<String, String>> sendVerificationEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요"));
        }
        try {
            emailVerificationService.sendVerificationCode(email);
            return ResponseEntity.ok(Map.of("message", "인증 코드가 전송되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @Operation(summary = "이메일 인증 코드 확인")
    @PostMapping("/email/verify")
    public ResponseEntity<Map<String, Object>> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");

        if (email == null || code == null) {
            return ResponseEntity.badRequest().body(Map.of("verified", false, "message", "이메일과 코드를 입력해주세요"));
        }

        boolean verified = emailVerificationService.verifyCode(email, code);
        if (verified) {
            return ResponseEntity.ok(Map.of("verified", true, "message", "인증이 완료되었습니다"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("verified", false, "message", "인증 코드가 올바르지 않거나 만료되었습니다"));
        }
    }
}
