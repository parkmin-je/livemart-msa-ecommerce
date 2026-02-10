package com.livemart.user.service;

import com.livemart.user.domain.User;
import com.livemart.user.domain.UserRole;
import com.livemart.user.domain.UserStatus;
import com.livemart.user.dto.*;
import com.livemart.user.repository.UserRepository;
import com.livemart.user.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService 단위 테스트")
class UserServiceTest {

    @InjectMocks
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Nested
    @DisplayName("회원가입")
    class SignupTest {

        @Test
        @DisplayName("성공 - 새로운 사용자 회원가입")
        void signup_success() {
            // given
            SignupRequest request = new SignupRequest("test@test.com", "password123", "테스터", "010-1234-5678");

            given(userRepository.existsByEmail("test@test.com")).willReturn(false);
            given(passwordEncoder.encode("password123")).willReturn("encodedPassword");
            given(userRepository.save(any(User.class))).willAnswer(invocation -> {
                User user = invocation.getArgument(0);
                return User.builder()
                        .email(user.getEmail())
                        .password(user.getPassword())
                        .name(user.getName())
                        .phoneNumber(user.getPhoneNumber())
                        .role(UserRole.USER)
                        .status(UserStatus.ACTIVE)
                        .build();
            });

            // when
            UserResponse response = userService.signup(request);

            // then
            assertThat(response).isNotNull();
            assertThat(response.getEmail()).isEqualTo("test@test.com");
            assertThat(response.getName()).isEqualTo("테스터");
            then(userRepository).should().save(any(User.class));
        }

        @Test
        @DisplayName("실패 - 이미 존재하는 이메일")
        void signup_duplicateEmail() {
            // given
            SignupRequest request = new SignupRequest("existing@test.com", "password123", "테스터", null);

            given(userRepository.existsByEmail("existing@test.com")).willReturn(true);

            // when & then
            assertThatThrownBy(() -> userService.signup(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("이미 사용 중인 이메일입니다");
        }
    }

    @Nested
    @DisplayName("로그인")
    class LoginTest {

        @Test
        @DisplayName("성공 - 올바른 자격증명")
        void login_success() {
            // given
            LoginRequest request = new LoginRequest("test@test.com", "password123");

            User user = User.builder()
                    .email("test@test.com")
                    .password("encodedPassword")
                    .name("테스터")
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .build();

            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("password123", "encodedPassword")).willReturn(true);
            given(jwtTokenProvider.createAccessToken(any(), eq("test@test.com"), eq("USER"))).willReturn("accessToken");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refreshToken");

            // when
            TokenResponse response = userService.login(request);

            // then
            assertThat(response.getAccessToken()).isEqualTo("accessToken");
            assertThat(response.getRefreshToken()).isEqualTo("refreshToken");
            assertThat(response.getTokenType()).isEqualTo("Bearer");
        }

        @Test
        @DisplayName("실패 - 잘못된 비밀번호")
        void login_wrongPassword() {
            // given
            LoginRequest request = new LoginRequest("test@test.com", "wrongPassword");

            User user = User.builder()
                    .email("test@test.com")
                    .password("encodedPassword")
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .build();

            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("wrongPassword", "encodedPassword")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> userService.login(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("이메일 또는 비밀번호가 올바르지 않습니다");
        }

        @Test
        @DisplayName("실패 - 비활성 계정")
        void login_inactiveAccount() {
            // given
            LoginRequest request = new LoginRequest("test@test.com", "password123");

            User user = User.builder()
                    .email("test@test.com")
                    .password("encodedPassword")
                    .role(UserRole.USER)
                    .status(UserStatus.SUSPENDED)
                    .build();

            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("password123", "encodedPassword")).willReturn(true);

            // when & then
            assertThatThrownBy(() -> userService.login(request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("비활성화된 계정입니다");
        }
    }

    @Nested
    @DisplayName("사용자 조회")
    class GetUserTest {

        @Test
        @DisplayName("성공 - ID로 사용자 조회")
        void getUserById_success() {
            // given
            User user = User.builder()
                    .email("test@test.com")
                    .name("테스터")
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .build();

            given(userRepository.findById(1L)).willReturn(Optional.of(user));

            // when
            UserResponse response = userService.getUserById(1L);

            // then
            assertThat(response.getEmail()).isEqualTo("test@test.com");
            assertThat(response.getName()).isEqualTo("테스터");
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 사용자")
        void getUserById_notFound() {
            // given
            given(userRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> userService.getUserById(999L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("사용자를 찾을 수 없습니다");
        }
    }

    @Test
    @DisplayName("로그아웃 - Refresh Token 삭제")
    void logout_success() {
        // given
        Long userId = 1L;

        // when
        userService.logout(userId);

        // then
        then(jwtTokenProvider).should().deleteRefreshToken(userId);
    }
}
