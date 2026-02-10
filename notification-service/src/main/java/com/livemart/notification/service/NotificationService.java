package com.livemart.notification.service;

import com.livemart.notification.domain.Notification;
import com.livemart.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 리액티브 알림 서비스 (WebFlux + Redis Reactive)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final ReactiveRedisTemplate<String, Notification> reactiveRedisTemplate;

    // SSE를 위한 Sink (실시간 알림 스트림)
    private final Sinks.Many<Notification> notificationSink = Sinks.many().multicast().onBackpressureBuffer();

    private static final String NOTIFICATION_KEY_PREFIX = "notifications:user:";

    /**
     * 알림 생성 및 저장 (리액티브)
     */
    public Mono<NotificationResponse> createNotification(Long userId, Notification.NotificationType type,
                                                          String title, String message, String referenceId) {
        Notification notification = Notification.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();

        String key = NOTIFICATION_KEY_PREFIX + userId;

        return reactiveRedisTemplate.opsForList()
                .leftPush(key, notification)
                .then(reactiveRedisTemplate.expire(key, Duration.ofDays(30)))
                .doOnSuccess(result -> {
                    notificationSink.tryEmitNext(notification);
                    log.info("알림 생성: userId={}, type={}, title={}", userId, type, title);
                })
                .thenReturn(NotificationResponse.from(notification));
    }

    /**
     * 사용자 알림 목록 조회 (리액티브)
     */
    public Flux<NotificationResponse> getUserNotifications(Long userId) {
        String key = NOTIFICATION_KEY_PREFIX + userId;
        return reactiveRedisTemplate.opsForList()
                .range(key, 0, 50)
                .map(NotificationResponse::from);
    }

    /**
     * 읽지 않은 알림 수 조회
     */
    public Mono<Long> getUnreadCount(Long userId) {
        String key = NOTIFICATION_KEY_PREFIX + userId;
        return reactiveRedisTemplate.opsForList()
                .range(key, 0, -1)
                .filter(n -> !n.isRead())
                .count();
    }

    /**
     * SSE 실시간 알림 스트림
     */
    public Flux<NotificationResponse> streamNotifications(Long userId) {
        return notificationSink.asFlux()
                .filter(n -> n.getUserId().equals(userId))
                .map(NotificationResponse::from);
    }
}
