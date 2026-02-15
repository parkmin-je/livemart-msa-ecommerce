package com.livemart.order.controller;

import com.livemart.order.delivery.DeliveryTracker;
import com.livemart.order.delivery.DeliveryTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@Tag(name = "Delivery API", description = "배송 추적 API")
@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryTrackingService deliveryTrackingService;

    @Operation(summary = "배송 추적 생성", description = "주문에 대한 배송 추적 정보를 생성합니다")
    @PostMapping("/{orderId}")
    public ResponseEntity<DeliveryTracker.DeliveryInfo> createTracking(
            @PathVariable Long orderId,
            @RequestParam(defaultValue = "CJ대한통운") String courierCompany) {
        DeliveryTracker.DeliveryInfo info = deliveryTrackingService.createDeliveryTracking(orderId, courierCompany);
        return ResponseEntity.status(HttpStatus.CREATED).body(info);
    }

    @Operation(summary = "배송 상태 조회", description = "운송장 번호로 배송 상태를 조회합니다")
    @GetMapping("/{trackingNumber}")
    public ResponseEntity<DeliveryTracker.DeliveryInfo> getDeliveryInfo(@PathVariable String trackingNumber) {
        return ResponseEntity.ok(deliveryTrackingService.getDeliveryInfo(trackingNumber));
    }

    @Operation(summary = "배송 상태 업데이트", description = "배송 상태와 위치를 업데이트합니다")
    @PutMapping("/{trackingNumber}")
    public ResponseEntity<DeliveryTracker.DeliveryInfo> updateStatus(
            @PathVariable String trackingNumber,
            @RequestParam DeliveryTracker.DeliveryStatus status,
            @RequestParam String location,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {
        DeliveryTracker.DeliveryInfo info = deliveryTrackingService.updateDeliveryStatus(
                trackingNumber, status, location, latitude, longitude);
        return ResponseEntity.ok(info);
    }

    @Operation(summary = "배송 완료", description = "배송 완료 처리합니다")
    @PostMapping("/{trackingNumber}/complete")
    public ResponseEntity<Void> completeDelivery(
            @PathVariable String trackingNumber,
            @RequestParam String recipientName) {
        deliveryTrackingService.completeDelivery(trackingNumber, recipientName);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "배송 실패", description = "배송 실패 처리합니다")
    @PostMapping("/{trackingNumber}/fail")
    public ResponseEntity<Void> failDelivery(
            @PathVariable String trackingNumber,
            @RequestParam String reason) {
        deliveryTrackingService.failDelivery(trackingNumber, reason);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "실시간 배송 추적 스트림", description = "SSE를 통한 실시간 배송 위치 업데이트")
    @GetMapping(value = "/{trackingNumber}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<DeliveryTracker.DeliveryInfo> streamDelivery(@PathVariable String trackingNumber) {
        return deliveryTrackingService.streamDeliveryUpdates(trackingNumber);
    }
}
