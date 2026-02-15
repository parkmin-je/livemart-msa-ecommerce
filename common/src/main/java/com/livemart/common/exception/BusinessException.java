package com.livemart.common.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final String code;
    private final int status;

    public BusinessException(String code, String message, int status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public BusinessException(String code, String message) {
        this(code, message, 400);
    }

    public static BusinessException notFound(String resource, Object id) {
        return new BusinessException("NOT_FOUND",
                resource + " with id '" + id + "' not found", 404);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException("CONFLICT", message, 409);
    }

    public static BusinessException insufficientStock(Long productId) {
        return new BusinessException("INSUFFICIENT_STOCK",
                "Insufficient stock for product: " + productId, 409);
    }

    public static BusinessException paymentFailed(String reason) {
        return new BusinessException("PAYMENT_FAILED", reason, 422);
    }
}
