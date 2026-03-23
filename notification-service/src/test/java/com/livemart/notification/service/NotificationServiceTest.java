package com.livemart.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.notification.domain.Notification;
import com.livemart.notification.dto.NotificationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.Mockito.lenient;

/**
 * NotificationService 단위 테스트
 *
 * NotificationService 는 @PostConstruct 에서 stringReactiveRedisTemplate.listenToChannel() 을
 * 호출하므로, 인스턴스를 직접 생성하고 @PostConstruct 를 수동으로 호출하는 방식을 사용한다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService 단위 테스트")
class NotificationServiceTest {

    @Mock
    private ReactiveRedisTemplate<String, Notification> reactiveRedisTemplate;

    @Mock
    private ReactiveRedisTemplate<String, String> stringReactiveRedisTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private ReactiveListOperations<String, Notification> listOperations;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        // @PostConstruct 에서 listenToChannel() 이 호출되므로 lenient stubbing 으로 처리
        lenient().when(stringReactiveRedisTemplate.listenToChannel(anyString()))
                .thenReturn(Flux.empty());

        // 직접 인스턴스 생성 후 @PostConstruct 수동 호출
        notificationService = new NotificationService(
                reactiveRedisTemplate, stringReactiveRedisTemplate, objectMapper);
        notificationService.startRedisSubscription();

        // Redis List 연산 기본 stub
        lenient().when(reactiveRedisTemplate.opsForList()).thenReturn(listOperations);
    }

    // ── createNotification ────────────────────────────────────────────────────

    @Test
    @DisplayName("ORDER_CREATED 알림 생성 — Redis 발행 후 올바른 userId·type 반환")
    void createNotification_order_publishesToRedisAndReturnsResponse() throws Exception {
        // given
        Long userId = 42L;
        Notification.NotificationType type = Notification.NotificationType.ORDER_CREATED;

        given(reactiveRedisTemplate.opsForList()).willReturn(listOperations);
        given(listOperations.leftPush(anyString(), any(Notification.class)))
                .willReturn(Mono.just(1L));
        given(reactiveRedisTemplate.expire(anyString(), any(Duration.class)))
                .willReturn(Mono.just(Boolean.TRUE));

        // serializeAndPublish: objectMapper.writeValueAsString → 직렬화 json 반환
        given(objectMapper.writeValueAsString(any(Notification.class)))
                .willReturn("{\"id\":\"test\"}");
        given(stringReactiveRedisTemplate.convertAndSend(anyString(), anyString()))
                .willReturn(Mono.just(1L));

        // when
        Mono<NotificationResponse> result = notificationService.createNotification(
                userId, type, "주문 완료", "주문이 접수됐습니다.", "ORD-001");

        // then
        StepVerifier.create(result)
                .assertNext(response -> {
                    assertThat(response.getUserId()).isEqualTo(userId);
                    assertThat(response.getType()).isEqualTo(type.name());
                    assertThat(response.getTitle()).isEqualTo("주문 완료");
                    assertThat(response.getId()).isNotNull();
                    assertThat(response.isRead()).isFalse();
                })
                .verifyComplete();
    }

    // ── getUnreadCount ────────────────────────────────────────────────────────

    @Test
    @DisplayName("읽지 않은 알림 2건 — getUnreadCount() = 2")
    void getUnreadCount_returnsCorrectCount() {
        // given
        Long userId = 1L;
        Notification read = Notification.builder()
                .id("r1").userId(userId)
                .type(Notification.NotificationType.ORDER_CONFIRMED)
                .title("확인").message("확인됨").read(true)
                .createdAt(LocalDateTime.now()).build();
        Notification unread1 = Notification.builder()
                .id("u1").userId(userId)
                .type(Notification.NotificationType.ORDER_SHIPPED)
                .title("배송").message("배송 시작").read(false)
                .createdAt(LocalDateTime.now()).build();
        Notification unread2 = Notification.builder()
                .id("u2").userId(userId)
                .type(Notification.NotificationType.STOCK_LOW)
                .title("재고").message("재고 부족").read(false)
                .createdAt(LocalDateTime.now()).build();

        given(reactiveRedisTemplate.opsForList()).willReturn(listOperations);
        given(listOperations.range(anyString(), eq(0L), eq(-1L)))
                .willReturn(Flux.just(read, unread1, unread2));

        // when & then: 읽지 않은 항목 2건
        StepVerifier.create(notificationService.getUnreadCount(userId))
                .assertNext(count -> assertThat(count).isEqualTo(2L))
                .verifyComplete();
    }

    // ── getUserNotifications ──────────────────────────────────────────────────

    @Test
    @DisplayName("사용자 알림 목록 조회 — NotificationResponse Flux 정상 반환")
    void getUserNotifications_returnsAllNotificationsForUser() {
        // given
        Long userId = 7L;
        Notification n1 = Notification.builder()
                .id("n1").userId(userId)
                .type(Notification.NotificationType.PAYMENT_COMPLETED)
                .title("결제").message("결제 완료").read(false)
                .createdAt(LocalDateTime.now()).build();
        Notification n2 = Notification.builder()
                .id("n2").userId(userId)
                .type(Notification.NotificationType.ORDER_DELIVERED)
                .title("배달").message("배달 완료").read(true)
                .createdAt(LocalDateTime.now()).build();

        given(reactiveRedisTemplate.opsForList()).willReturn(listOperations);
        given(listOperations.range(anyString(), eq(0L), eq(50L)))
                .willReturn(Flux.just(n1, n2));

        // when
        StepVerifier.create(notificationService.getUserNotifications(userId))
                .assertNext(r -> {
                    assertThat(r.getId()).isEqualTo("n1");
                    assertThat(r.getUserId()).isEqualTo(userId);
                    assertThat(r.getType()).isEqualTo(Notification.NotificationType.PAYMENT_COMPLETED.name());
                })
                .assertNext(r -> assertThat(r.getId()).isEqualTo("n2"))
                .verifyComplete();
    }

    @Test
    @DisplayName("알림 없음 — 빈 Flux 반환")
    void getUserNotifications_noNotifications_returnsEmptyFlux() {
        // given
        given(reactiveRedisTemplate.opsForList()).willReturn(listOperations);
        given(listOperations.range(anyString(), eq(0L), eq(50L)))
                .willReturn(Flux.empty());

        // when & then
        StepVerifier.create(notificationService.getUserNotifications(999L))
                .verifyComplete();
    }
}
