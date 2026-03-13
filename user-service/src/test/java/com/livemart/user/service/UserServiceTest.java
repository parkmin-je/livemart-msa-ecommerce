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

    // ──────────────────────────────────────────────────────────────────
    // 회원가입
    // ──────────────────────────────────────────────────────────────────

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

    // ──────────────────────────────────────────────────────────────────
    // 로그인
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("로그인")
    class LoginTest {

        @Test
        @DisplayName("성공 - 올바른 자격증명으로 LoginResult(토큰 포함) 반환")
        void login_success_returnsTokens() {
            // given
            LoginRequest request = new LoginRequest("test@test.com", "password123");

            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .password("encodedPassword")
                    .name("테스터")
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .build();

            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("password123", "encodedPassword")).willReturn(true);
            given(jwtTokenProvider.createAccessToken(1L, "test@test.com", "USER")).willReturn("access-jwt-token");
            given(jwtTokenProvider.createRefreshToken(1L)).willReturn("refresh-jwt-token");
            given(jwtTokenProvider.getAccessTokenExpiration()).willReturn(86400000L);
            given(jwtTokenProvider.getRefreshTokenExpiration()).willReturn(604800000L);

            // when
            LoginResult result = userService.login(request);

            // then
            assertThat(result).isNotNull();
            assertThat(result.getAccessToken()).isEqualTo("access-jwt-token");
            assertThat(result.getRefreshToken()).isEqualTo("refresh-jwt-token");
            assertThat(result.getUserId()).isEqualTo(1L);
            assertThat(result.getEmail()).isEqualTo("test@test.com");
            assertThat(result.getName()).isEqualTo("테스터");
            assertThat(result.getRole()).isEqualTo("USER");
            assertThat(result.getAccessTokenExpiry()).isEqualTo(86400000L);
        }

        @Test
        @DisplayName("실패 - 잘못된 비밀번호로 예외 발생")
        void login_wrongPassword_throwsException() {
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
        @DisplayName("실패 - 존재하지 않는 이메일로 예외 발생")
        void login_emailNotFound_throwsException() {
            // given
            given(userRepository.findByEmail("ghost@test.com")).willReturn(Optional.empty());
            LoginRequest request = new LoginRequest("ghost@test.com", "password123");

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

    // ──────────────────────────────────────────────────────────────────
    // 토큰 갱신
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("토큰 갱신 (refresh)")
    class RefreshTokenTest {

        @Test
        @DisplayName("성공 - 유효한 Refresh Token으로 새 토큰 발급")
        void refresh_validToken_returnsNewTokens() {
            // given
            String validRefreshToken = "valid-refresh-token";
            Long userId = 5L;

            User user = User.builder()
                    .id(userId)
                    .email("refresh@test.com")
                    .name("갱신유저")
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .build();

            given(jwtTokenProvider.validateToken(validRefreshToken)).willReturn(true);
            given(jwtTokenProvider.getUserIdFromToken(validRefreshToken)).willReturn(userId);
            given(jwtTokenProvider.validateRefreshToken(userId, validRefreshToken)).willReturn(true);
            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(jwtTokenProvider.createAccessToken(userId, "refresh@test.com", "USER"))
                    .willReturn("new-access-token");
            given(jwtTokenProvider.createRefreshToken(userId)).willReturn("new-refresh-token");
            given(jwtTokenProvider.getAccessTokenExpiration()).willReturn(86400000L);
            given(jwtTokenProvider.getRefreshTokenExpiration()).willReturn(604800000L);

            // when
            LoginResult result = userService.refresh(validRefreshToken);

            // then
            assertThat(result).isNotNull();
            assertThat(result.getAccessToken()).isEqualTo("new-access-token");
            assertThat(result.getRefreshToken()).isEqualTo("new-refresh-token");
            assertThat(result.getUserId()).isEqualTo(userId);
            assertThat(result.getEmail()).isEqualTo("refresh@test.com");
            assertThat(result.getRole()).isEqualTo("USER");
            then(jwtTokenProvider).should().createAccessToken(userId, "refresh@test.com", "USER");
            then(jwtTokenProvider).should().createRefreshToken(userId);
        }

        @Test
        @DisplayName("실패 - 유효하지 않은 Refresh Token")
        void refresh_invalidToken_throwsException() {
            // given
            String invalidToken = "expired-or-tampered-token";
            given(jwtTokenProvider.validateToken(invalidToken)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> userService.refresh(invalidToken))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("유효하지 않은 Refresh Token입니다");
            then(userRepository).should(never()).findById(anyLong());
        }

        @Test
        @DisplayName("실패 - Redis에 저장된 토큰과 불일치")
        void refresh_tokenMismatch_throwsException() {
            // given
            String refreshToken = "mismatched-refresh-token";
            Long userId = 6L;

            given(jwtTokenProvider.validateToken(refreshToken)).willReturn(true);
            given(jwtTokenProvider.getUserIdFromToken(refreshToken)).willReturn(userId);
            given(jwtTokenProvider.validateRefreshToken(userId, refreshToken)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> userService.refresh(refreshToken))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Refresh Token이 만료되었거나 일치하지 않습니다");
            then(userRepository).should(never()).findById(anyLong());
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // 사용자 조회
    // ──────────────────────────────────────────────────────────────────

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
        @DisplayName("실패 - 존재하지 않는 사용자 ID로 예외 발생")
        void getUserById_notFound_throwsException() {
            // given
            given(userRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> userService.getUserById(999L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("사용자를 찾을 수 없습니다");
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // 프로필 수정
    // ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("프로필 수정 (updateMyProfile)")
    class UpdateProfileTest {

        @Test
        @DisplayName("성공 - 이름 및 전화번호 변경")
        void updateProfile_success() {
            // given
            Long userId = 10L;
            User user = User.builder()
                    .id(userId)
                    .email("profile@test.com")
                    .name("기존이름")
                    .phoneNumber("010-1111-2222")
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .build();

            UpdateProfileRequest request = new UpdateProfileRequest("새이름", "010-9999-8888");

            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

            // when
            UserResponse response = userService.updateMyProfile(userId, request);

            // then
            assertThat(response).isNotNull();
            // updateProfile() mutates the user entity in-place
            assertThat(user.getName()).isEqualTo("새이름");
            assertThat(user.getPhoneNumber()).isEqualTo("010-9999-8888");
            then(userRepository).should(times(1)).save(user);
        }

        @Test
        @DisplayName("성공 - 이름이 null인 경우 기존 이름 유지")
        void updateProfile_nullName_keepsExistingName() {
            // given
            Long userId = 11L;
            User user = User.builder()
                    .id(userId)
                    .email("keep@test.com")
                    .name("유지할이름")
                    .phoneNumber("010-3333-4444")
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .build();

            // name is null → service falls back to existing name
            UpdateProfileRequest request = new UpdateProfileRequest(null, "010-5555-6666");

            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

            // when
            userService.updateMyProfile(userId, request);

            // then: name unchanged, phone updated
            assertThat(user.getName()).isEqualTo("유지할이름");
            assertThat(user.getPhoneNumber()).isEqualTo("010-5555-6666");
        }

        @Test
        @DisplayName("실패 - 존재하지 않는 사용자 프로필 수정 시도")
        void updateProfile_userNotFound_throwsException() {
            // given
            given(userRepository.findById(999L)).willReturn(Optional.empty());
            UpdateProfileRequest request = new UpdateProfileRequest("이름", "010-0000-0000");

            // when & then
            assertThatThrownBy(() -> userService.updateMyProfile(999L, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("사용자를 찾을 수 없습니다");
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // 로그아웃
    // ──────────────────────────────────────────────────────────────────

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
