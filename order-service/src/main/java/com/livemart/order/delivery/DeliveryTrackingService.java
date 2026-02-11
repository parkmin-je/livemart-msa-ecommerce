package com.livemart.order.delivery;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 실시간 배송 추적 서비스
 * WebSocket + SSE를 통한 실시간 위치 업데이트
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryTrackingService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String DELIVERY_KEY_PREFIX = "delivery:tracking:";
    private static final String DELIVERY_LOCATION_KEY = "delivery:location:";

    /**
     * 배송 정보 생성
     */
    public DeliveryTracker.DeliveryInfo createDeliveryTracking(Long orderId, String courierCompany) {
        String trackingNumber = generateTrackingNumber(orderId);

        DeliveryTracker.DeliveryInfo deliveryInfo = DeliveryTracker.DeliveryInfo.builder()
            .orderId(orderId)
            .trackingNumber(trackingNumber)
            .status(DeliveryTracker.DeliveryStatus.PREPARING)
            .courierCompany(courierCompany)
            .currentLocation("물류센터")
            .estimatedDeliveryTime(LocalDateTime.now().plusDays(2))
            .history(new ArrayList<>())
            .build();

        // 첫 히스토리 추가
        addDeliveryHistory(deliveryInfo, "상품이 물류센터에 입고되었습니다.");

        // Redis 저장 (7일 TTL)
        saveToRedis(trackingNumber, deliveryInfo);

        log.info("Delivery tracking created: orderId={}, trackingNumber={}", orderId, trackingNumber);
        return deliveryInfo;
    }

    /**
     * 배송 상태 업데이트
     */
    public DeliveryTracker.DeliveryInfo updateDeliveryStatus(
        String trackingNumber,
        DeliveryTracker.DeliveryStatus newStatus,
        String location,
        Double latitude,
        Double longitude
    ) {
        DeliveryTracker.DeliveryInfo deliveryInfo = getDeliveryInfo(trackingNumber);

        deliveryInfo.setStatus(newStatus);
        deliveryInfo.setCurrentLocation(location);
        deliveryInfo.setLatitude(latitude);
        deliveryInfo.setLongitude(longitude);

        addDeliveryHistory(deliveryInfo, location);

        // Redis 업데이트
        saveToRedis(trackingNumber, deliveryInfo);

        // 실시간 위치 저장 (GeoSpatial)
        saveLocationToRedis(trackingNumber, latitude, longitude);

        log.info("Delivery status updated: trackingNumber={}, status={}, location={}",
                 trackingNumber, newStatus, location);

        return deliveryInfo;
    }

    /**
     * 배송 정보 조회
     */
    public DeliveryTracker.DeliveryInfo getDeliveryInfo(String trackingNumber) {
        String key = DELIVERY_KEY_PREFIX + trackingNumber;
        DeliveryTracker.DeliveryInfo deliveryInfo =
            (DeliveryTracker.DeliveryInfo) redisTemplate.opsForValue().get(key);

        if (deliveryInfo == null) {
            throw new IllegalArgumentException("배송 정보를 찾을 수 없습니다: " + trackingNumber);
        }

        return deliveryInfo;
    }

    /**
     * 실시간 배송 추적 스트리밍 (WebFlux)
     */
    public Flux<DeliveryTracker.DeliveryInfo> streamDeliveryUpdates(String trackingNumber) {
        return Flux.interval(Duration.ofSeconds(10))
            .map(i -> getDeliveryInfo(trackingNumber))
            .doOnNext(info -> log.debug("Streaming delivery update: {}", trackingNumber))
            .onErrorResume(e -> {
                log.error("Failed to stream delivery updates: {}", trackingNumber, e);
                return Flux.empty();
            });
    }

    /**
     * 주변 배송 기사 찾기 (GeoSpatial)
     */
    public List<String> findNearbyDeliveries(Double latitude, Double longitude, Double radiusKm) {
        // Redis GeoSpatial 명령어 사용
        // GEORADIUS delivery:locations {latitude} {longitude} {radius} km
        return new ArrayList<>(); // 실제 구현 시 GeoCommands 사용
    }

    /**
     * 예상 배송 시간 계산
     */
    public LocalDateTime calculateEstimatedDeliveryTime(String currentLocation, String destinationAddress) {
        // 실제로는 외부 API (Google Maps, Naver Maps) 호출
        // 여기서는 간단히 2일 후로 설정
        return LocalDateTime.now().plusDays(2);
    }

    /**
     * 배송 완료 처리
     */
    public void completeDelivery(String trackingNumber, String recipientName) {
        DeliveryTracker.DeliveryInfo deliveryInfo = getDeliveryInfo(trackingNumber);

        deliveryInfo.setStatus(DeliveryTracker.DeliveryStatus.DELIVERED);
        addDeliveryHistory(deliveryInfo,
            String.format("배송 완료 - 수령인: %s", recipientName));

        saveToRedis(trackingNumber, deliveryInfo);

        log.info("Delivery completed: trackingNumber={}, recipient={}",
                 trackingNumber, recipientName);
    }

    /**
     * 배송 실패 처리
     */
    public void failDelivery(String trackingNumber, String reason) {
        DeliveryTracker.DeliveryInfo deliveryInfo = getDeliveryInfo(trackingNumber);

        deliveryInfo.setStatus(DeliveryTracker.DeliveryStatus.FAILED);
        addDeliveryHistory(deliveryInfo, "배송 실패: " + reason);

        saveToRedis(trackingNumber, deliveryInfo);

        log.warn("Delivery failed: trackingNumber={}, reason={}", trackingNumber, reason);
    }

    // Helper methods

    private void addDeliveryHistory(DeliveryTracker.DeliveryInfo deliveryInfo, String description) {
        DeliveryTracker.DeliveryHistory history = DeliveryTracker.DeliveryHistory.builder()
            .timestamp(LocalDateTime.now())
            .status(deliveryInfo.getStatus())
            .location(deliveryInfo.getCurrentLocation())
            .description(description)
            .build();

        deliveryInfo.getHistory().add(history);
    }

    private void saveToRedis(String trackingNumber, DeliveryTracker.DeliveryInfo deliveryInfo) {
        String key = DELIVERY_KEY_PREFIX + trackingNumber;
        redisTemplate.opsForValue().set(key, deliveryInfo, 7, TimeUnit.DAYS);
    }

    private void saveLocationToRedis(String trackingNumber, Double latitude, Double longitude) {
        if (latitude != null && longitude != null) {
            String locationKey = DELIVERY_LOCATION_KEY + trackingNumber;
            redisTemplate.opsForGeo().add(locationKey,
                new org.springframework.data.geo.Point(longitude, latitude),
                trackingNumber);
        }
    }

    private String generateTrackingNumber(Long orderId) {
        return "LIVE" + System.currentTimeMillis() + orderId;
    }
}
