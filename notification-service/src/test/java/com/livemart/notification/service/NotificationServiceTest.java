package com.livemart.notification.service;

import com.livemart.notification.domain.Notification;
import com.livemart.notification.dto.NotificationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ReactiveListOperations;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService 단위 테스트")
class NotificationServiceTest {

    @Mock
    private ReactiveRedisTemplate<String, Notification> reactiveRedisTemplate;

    @Mock
    private ReactiveListOperations<String, Notification> listOperations;

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        given(reactiveRedisTemplate.opsForList()).willReturn(listOperations);
    }

    @Nested
    @DisplayName("createNotification")
    class CreateNotificationTest {

        @Test
        @DisplayName("알림 생성 성공 — NotificationResponse 반환")
        void createNotification_success() {
            // given
            Long userId = 1L;
            Notification.NotificationType type = Notification.NotificationType.ORDER_CREATED;
            String title = "주문 완료";
            String message = "주문이 성공적으로 접수됐습니다.";
            String referenceId = "ORD-001";

            given(listOperations.leftPush(anyString(), any(Notification.class)))
                    .willReturn(Mono.just(1L));
            given(reactiveRedisTemplate.expire(anyString(), any(Duration.class)))
                    .willReturn(Mono.just(Boolean.TRUE));

            // when
            Mono<NotificationResponse> result = notificationService.createNotification(
                    userId, type, title, message, referenceId);

            // then
            StepVerifier.create(result)
                    .assertNext(response -> {
                        assertThat(response.getId()).isNotNull();
                        assertThat(response.getUserId()).isEqualTo(userId);
                        assertThat(response.getType()).isEqualTo(type.name());
                        assertThat(response.getTitle()).isEqualTo(title);
                        assertThat(response.getMessage()).isEqualTo(message);
                        assertThat(response.isRead()).isFalse();
                        assertThat(response.getCreatedAt()).isNotNull();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("알림 생성 — 다양한 NotificationType 처리")
        void createNotification_variousTypes() {
            // given
            given(listOperations.leftPush(anyString(), any(Notification.class)))
                    .willReturn(Mono.just(1L));
            given(reactiveRedisTemplate.expire(anyString(), any(Duration.class)))
                    .willReturn(Mono.just(Boolean.TRUE));

            // when & then
            for (Notification.NotificationType type : Notification.NotificationType.values()) {
                StepVerifier.create(
                        notificationService.createNotification(1L, type, "테스트", "내용", "REF-001"))
                        .assertNext(response -> assertThat(response.getType()).isEqualTo(type.name()))
                        .verifyComplete();
            }
        }
    }

    @Nested
    @DisplayName("getUserNotifications")
    class GetUserNotificationsTest {

        @Test
        @DisplayName("사용자 알림 목록 조회 — Flux 반환")
        void getUserNotifications_returnsFlux() {
            // given
            Long userId = 1L;
            Notification n1 = Notification.builder()
                    .id("id-1").userId(userId)
                    .type(Notification.NotificationType.ORDER_CREATED)
                    .title("주문 완료").message("접수됨").read(false)
                    .createdAt(LocalDateTime.now()).build();
            Notification n2 = Notification.builder()
                    .id("id-2").userId(userId)
                    .type(Notification.NotificationType.PAYMENT_COMPLETED)
                    .title("결제 완료").message("결제됨").read(true)
                    .createdAt(LocalDateTime.now()).build();

            given(listOperations.range(anyString(), eq(0L), eq(50L)))
                    .willReturn(Flux.just(n1, n2));

            // when
            Flux<NotificationResponse> result = notificationService.getUserNotifications(userId);

            // then
            StepVerifier.create(result)
                    .assertNext(r -> assertThat(r.getId()).isEqualTo("id-1"))
                    .assertNext(r -> assertThat(r.getId()).isEqualTo("id-2"))
                    .verifyComplete();
        }

        @Test
        @DisplayName("사용자 알림 없음 — 빈 Flux 반환")
        void getUserNotifications_empty() {
            // given
            given(listOperations.range(anyString(), eq(0L), eq(50L)))
                    .willReturn(Flux.empty());

            // when & then
            StepVerifier.create(notificationService.getUserNotifications(999L))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getUnreadCount")
    class GetUnreadCountTest {

        @Test
        @DisplayName("읽지 않은 알림 수 반환")
        void getUnreadCount_returnsCorrectCount() {
            // given
            Long userId = 1L;
            Notification read = Notification.builder()
                    .id("r1").userId(userId).type(Notification.NotificationType.ORDER_CONFIRMED)
                    .title("t").message("m").read(true).createdAt(LocalDateTime.now()).build();
            Notification unread1 = Notification.builder()
                    .id("u1").userId(userId).type(Notification.NotificationType.ORDER_SHIPPED)
                    .title("t").message("m").read(false).createdAt(LocalDateTime.now()).build();
            Notification unread2 = Notification.builder()
                    .id("u2").userId(userId).type(Notification.NotificationType.STOCK_LOW)
                    .title("t").message("m").read(false).createdAt(LocalDateTime.now()).build();

            given(listOperations.range(anyString(), eq(0L), eq(-1L)))
                    .willReturn(Flux.just(read, unread1, unread2));

            // when & then
            StepVerifier.create(notificationService.getUnreadCount(userId))
                    .assertNext(count -> assertThat(count).isEqualTo(2L))
                    .verifyComplete();
        }

        @Test
        @DisplayName("모두 읽은 경우 0 반환")
        void getUnreadCount_allRead_returnsZero() {
            // given
            Notification read = Notification.builder()
                    .id("r1").userId(1L).type(Notification.NotificationType.ORDER_DELIVERED)
                    .title("t").message("m").read(true).createdAt(LocalDateTime.now()).build();

            given(listOperations.range(anyString(), eq(0L), eq(-1L)))
                    .willReturn(Flux.just(read));

            // when & then
            StepVerifier.create(notificationService.getUnreadCount(1L))
                    .assertNext(count -> assertThat(count).isZero())
                    .verifyComplete();
        }
    }
}
