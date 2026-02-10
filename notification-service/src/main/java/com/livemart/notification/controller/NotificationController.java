package com.livemart.notification.controller;

import com.livemart.notification.dto.NotificationResponse;
import com.livemart.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * 알림 컨트롤러 (WebFlux 리액티브 엔드포인트)
 */
@Tag(name = "Notification API", description = "실시간 알림 API (WebFlux SSE)")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "사용자 알림 목록", description = "사용자의 최근 알림 목록을 조회합니다")
    @GetMapping("/user/{userId}")
    public Flux<NotificationResponse> getUserNotifications(@PathVariable Long userId) {
        return notificationService.getUserNotifications(userId);
    }

    @Operation(summary = "읽지 않은 알림 수", description = "읽지 않은 알림 수를 반환합니다")
    @GetMapping("/user/{userId}/unread-count")
    public Mono<Long> getUnreadCount(@PathVariable Long userId) {
        return notificationService.getUnreadCount(userId);
    }

    @Operation(summary = "실시간 알림 스트림 (SSE)", description = "Server-Sent Events로 실시간 알림을 수신합니다")
    @GetMapping(value = "/stream/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<NotificationResponse>> streamNotifications(@PathVariable Long userId) {
        return notificationService.streamNotifications(userId)
                .map(notification -> ServerSentEvent.<NotificationResponse>builder()
                        .id(notification.getId())
                        .event("notification")
                        .data(notification)
                        .build());
    }

    @Operation(summary = "헬스체크")
    @GetMapping("/health")
    public Mono<String> health() {
        return Mono.just("Notification Service is running (WebFlux)");
    }
}
