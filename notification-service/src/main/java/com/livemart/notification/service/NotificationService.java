package com.livemart.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.livemart.notification.domain.Notification;
import com.livemart.notification.dto.NotificationResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 리액티브 알림 서비스 — Redis Pub/Sub + 로컬 Sinks 하이브리드
 *
 * 아키텍처:
 *   createNotification()   → Redis LIST 저장 + Redis PUBLISH "notification:events"
 *   @PostConstruct         → Redis SUBSCRIBE (background) → 수신 시 로컬 Sink에 push
 *   streamNotifications()  → 로컬 Sink.asFlux() (즉시 SSE 헤더 전송)
 *
 * 효과: 어느 인스턴스에서 알림 생성되든 Redis Pub/Sub로 모든 인스턴스에 전달되며,
 *       SSE 연결은 로컬 Sink를 통해 즉시 HTTP 헤더 전송 (hang 없음)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final ReactiveRedisTemplate<String, Notification> reactiveRedisTemplate;
    private final ReactiveRedisTemplate<String, String> stringReactiveRedisTemplate;
    private final ObjectMapper objectMapper;

    // userId → 해당 사용자의 로컬 SSE 스트림 Sink
    private final Map<Long, Sinks.Many<Notification>> userSinks = new ConcurrentHashMap<>();

    private static final String NOTIFICATION_KEY_PREFIX = "notifications:user:";
    static final String NOTIFICATION_CHANNEL = "notification:events";

    /**
     * 애플리케이션 시작 시 Redis Pub/Sub 구독 초기화
     * 다른 인스턴스에서 발행한 알림을 수신하여 로컬 Sink에 push
     */
    @PostConstruct
    public void startRedisSubscription() {
        stringReactiveRedisTemplate
                .listenToChannel(NOTIFICATION_CHANNEL)
                .map(message -> message.getMessage())
                .flatMap(this::deserializeNotification)
                .subscribe(
                    notification -> pushToLocalSink(notification),
                    error -> log.error("Redis 알림 구독 오류: {}", error.getMessage())
                );
        log.info("Redis 알림 채널 구독 시작: {}", NOTIFICATION_CHANNEL);
    }

    /**
     * 알림 생성: Redis LIST 저장 + Redis Pub/Sub 발행
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

        String listKey = NOTIFICATION_KEY_PREFIX + userId;

        return reactiveRedisTemplate.opsForList()
                .leftPush(listKey, notification)
                .then(reactiveRedisTemplate.expire(listKey, Duration.ofDays(30)))
                .then(serializeAndPublish(notification))
                .doOnSuccess(v -> log.info("알림 생성 및 발행: userId={}, type={}", userId, type))
                .thenReturn(NotificationResponse.from(notification));
    }

    /**
     * 사용자 알림 목록 조회
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
     * 로컬 Sink를 통해 즉시 HTTP 헤더 전송, Redis Pub/Sub로 크로스 인스턴스 수신
     */
    public Flux<NotificationResponse> streamNotifications(Long userId) {
        Sinks.Many<Notification> sink = userSinks.computeIfAbsent(userId,
                k -> Sinks.many().multicast().onBackpressureBuffer());

        return sink.asFlux()
                .map(NotificationResponse::from)
                .doOnSubscribe(s -> log.info("SSE 구독 시작: userId={}", userId))
                .doOnCancel(() -> {
                    userSinks.remove(userId);
                    log.info("SSE 구독 종료: userId={}", userId);
                });
    }

    /**
     * 알림 읽음 처리
     */
    public Mono<Void> markAsRead(Long userId, String notificationId) {
        String key = NOTIFICATION_KEY_PREFIX + userId;
        return reactiveRedisTemplate.opsForList()
                .range(key, 0, -1)
                .map(n -> {
                    if (notificationId.equals(n.getId()) && !n.isRead()) {
                        return Notification.builder()
                                .id(n.getId())
                                .userId(n.getUserId())
                                .type(n.getType())
                                .title(n.getTitle())
                                .message(n.getMessage())
                                .referenceId(n.getReferenceId())
                                .read(true)
                                .createdAt(n.getCreatedAt())
                                .build();
                    }
                    return n;
                })
                .collectList()
                .flatMap(notifications -> {
                    if (notifications.isEmpty()) return Mono.empty();
                    return reactiveRedisTemplate.delete(key)
                            .then(reactiveRedisTemplate.opsForList()
                                    .rightPushAll(key, notifications)
                                    .then(reactiveRedisTemplate.expire(key, Duration.ofDays(30)).then()));
                });
    }

    /**
     * 전체 알림 읽음 처리
     */
    public Mono<Void> markAllAsRead(Long userId) {
        String key = NOTIFICATION_KEY_PREFIX + userId;
        return reactiveRedisTemplate.opsForList()
                .range(key, 0, -1)
                .map(n -> Notification.builder()
                        .id(n.getId())
                        .userId(n.getUserId())
                        .type(n.getType())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .referenceId(n.getReferenceId())
                        .read(true)
                        .createdAt(n.getCreatedAt())
                        .build())
                .collectList()
                .flatMap(notifications -> {
                    if (notifications.isEmpty()) return Mono.empty();
                    return reactiveRedisTemplate.delete(key)
                            .then(reactiveRedisTemplate.opsForList()
                                    .rightPushAll(key, notifications)
                                    .then(reactiveRedisTemplate.expire(key, Duration.ofDays(30)).then()));
                });
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private void pushToLocalSink(Notification notification) {
        Sinks.Many<Notification> sink = userSinks.get(notification.getUserId());
        if (sink != null) {
            sink.tryEmitNext(notification);
        }
    }

    private Mono<Void> serializeAndPublish(Notification notification) {
        try {
            String json = objectMapper.writeValueAsString(notification);
            return stringReactiveRedisTemplate.convertAndSend(NOTIFICATION_CHANNEL, json).then();
        } catch (JsonProcessingException e) {
            log.error("알림 직렬화 실패: {}", e.getMessage());
            return Mono.empty();
        }
    }

    private Mono<Notification> deserializeNotification(String json) {
        try {
            return Mono.just(objectMapper.readValue(json, Notification.class));
        } catch (Exception e) {
            log.error("알림 역직렬화 실패: {}", e.getMessage());
            return Mono.empty();
        }
    }
}
