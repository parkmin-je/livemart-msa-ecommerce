package com.livemart.user.controller;

import com.livemart.user.dto.*;
import com.livemart.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserController 단위 테스트")
class UserControllerTest {

    @InjectMocks
    private UserController userController;

    @Mock
    private UserService userService;

    @Test
    @DisplayName("POST /api/users/signup - 회원가입 성공")
    void signup_success() {
        // given
        SignupRequest request = new SignupRequest("test@test.com", "password123", "테스터", "010-1234-5678");

        UserResponse response = UserResponse.builder()
                .id(1L)
                .email("test@test.com")
                .name("테스터")
                .build();

        given(userService.signup(any(SignupRequest.class))).willReturn(response);

        // when
        ResponseEntity<UserResponse> result = userController.signup(request);

        // then
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getEmail()).isEqualTo("test@test.com");
        assertThat(result.getBody().getName()).isEqualTo("테스터");
    }

    @Test
    @DisplayName("POST /api/users/login - 로그인 성공")
    void login_success() {
        // given
        LoginRequest request = new LoginRequest("test@test.com", "password123");

        TokenResponse response = TokenResponse.builder()
                .accessToken("accessToken123")
                .refreshToken("refreshToken123")
                .tokenType("Bearer")
                .expiresIn(86400L)
                .build();

        given(userService.login(any(LoginRequest.class))).willReturn(response);

        // when
        ResponseEntity<TokenResponse> result = userController.login(request);

        // then
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getAccessToken()).isEqualTo("accessToken123");
        assertThat(result.getBody().getTokenType()).isEqualTo("Bearer");
    }
}
