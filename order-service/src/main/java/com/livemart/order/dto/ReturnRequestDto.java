package com.livemart.order.dto;

import com.livemart.order.domain.ReturnRequest;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ReturnRequestDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Create {
        @NotNull(message = "주문 ID는 필수입니다")
        private Long orderId;

        @NotNull(message = "사용자 ID는 필수입니다")
        private Long userId;

        @NotNull(message = "반품 유형은 필수입니다")
        private ReturnRequest.ReturnType returnType;

        @NotNull(message = "반품 사유는 필수입니다")
        private ReturnRequest.ReturnReason reason;

        private String reasonDetail;
        private String imageUrls;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Approve {
        private BigDecimal refundAmount;
        private String adminNote;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Reject {
        private String adminNote;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String returnNumber;
        private Long orderId;
        private String orderNumber;
        private Long userId;
        private ReturnRequest.ReturnType returnType;
        private ReturnRequest.ReturnStatus status;
        private ReturnRequest.ReturnReason reason;
        private String reasonDetail;
        private BigDecimal refundAmount;
        private String imageUrls;
        private String adminNote;
        private LocalDateTime requestedAt;
        private LocalDateTime approvedAt;
        private LocalDateTime completedAt;

        public static Response from(ReturnRequest req) {
            return Response.builder()
                    .id(req.getId())
                    .returnNumber(req.getReturnNumber())
                    .orderId(req.getOrder().getId())
                    .orderNumber(req.getOrder().getOrderNumber())
                    .userId(req.getUserId())
                    .returnType(req.getReturnType())
                    .status(req.getStatus())
                    .reason(req.getReason())
                    .reasonDetail(req.getReasonDetail())
                    .refundAmount(req.getRefundAmount())
                    .imageUrls(req.getImageUrls())
                    .adminNote(req.getAdminNote())
                    .requestedAt(req.getRequestedAt())
                    .approvedAt(req.getApprovedAt())
                    .completedAt(req.getCompletedAt())
                    .build();
        }
    }
}
