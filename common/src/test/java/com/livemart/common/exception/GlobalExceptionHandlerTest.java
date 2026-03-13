package com.livemart.common.exception;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("GlobalExceptionHandler")
class GlobalExceptionHandlerTest {

    @InjectMocks
    private GlobalExceptionHandler handler;

    @Test
    @DisplayName("EntityNotFoundException → 404 ProblemDetail")
    void handlesEntityNotFoundException() {
        ProblemDetail detail = handler.handleNotFound(new EntityNotFoundException("Product not found"));

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
    }

    @Test
    @DisplayName("IllegalArgumentException → 400 ProblemDetail")
    void handlesIllegalArgumentException() {
        ProblemDetail detail = handler.handleBadRequest(new IllegalArgumentException("Invalid price"));

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
    }

    @Test
    @DisplayName("IllegalStateException → 409 ProblemDetail")
    void handlesIllegalStateException() {
        ProblemDetail detail = handler.handleConflict(new IllegalStateException("Duplicate key"));

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
    }

    @Test
    @DisplayName("BusinessException → 커스텀 status + code 포함 ProblemDetail")
    void handlesBusinessException() {
        BusinessException ex = new BusinessException(422, "INSUFFICIENT_STOCK", "재고 부족");

        ProblemDetail detail = handler.handleBusiness(ex);

        assertThat(detail.getStatus()).isEqualTo(422);
        assertThat(detail.getProperties()).containsKey("code");
        assertThat(detail.getProperties().get("code")).isEqualTo("INSUFFICIENT_STOCK");
    }

    @Test
    @DisplayName("MethodArgumentNotValidException → 400 + errors 맵 포함")
    void handlesValidationException() throws Exception {
        BindingResult bindingResult = org.mockito.Mockito.mock(BindingResult.class);
        FieldError fieldError = new FieldError("dto", "price", "must be positive");
        given(bindingResult.getFieldErrors()).willReturn(List.of(fieldError));

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        ProblemDetail detail = handler.handleValidation(ex);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(detail.getProperties()).containsKey("errors");
        @SuppressWarnings("unchecked")
        var errors = (java.util.Map<String, String>) detail.getProperties().get("errors");
        assertThat(errors).containsEntry("price", "must be positive");
    }

    @Test
    @DisplayName("알 수 없는 예외 → 500 ProblemDetail")
    void handlesGenericException() {
        ProblemDetail detail = handler.handleGeneric(new RuntimeException("unknown"));

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
    }
}
