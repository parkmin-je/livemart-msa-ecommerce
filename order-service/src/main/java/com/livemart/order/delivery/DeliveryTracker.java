package com.livemart.order.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 배송 추적 시스템
 * 실시간 배송 위치 및 상태 추적
 */
public class DeliveryTracker {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryInfo {
        private Long orderId;
        private String trackingNumber;
        private DeliveryStatus status;
        private String courierCompany;
        private String currentLocation;
        private Double latitude;
        private Double longitude;
        private LocalDateTime estimatedDeliveryTime;
        private List<DeliveryHistory> history;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryHistory {
        private LocalDateTime timestamp;
        private DeliveryStatus status;
        private String location;
        private String description;
    }

    public enum DeliveryStatus {
        PREPARING("상품 준비 중"),
        SHIPPED("배송 시작"),
        IN_TRANSIT("배송 중"),
        OUT_FOR_DELIVERY("배송 출발"),
        DELIVERED("배송 완료"),
        FAILED("배송 실패"),
        RETURNED("반송");

        private final String description;

        DeliveryStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
}
