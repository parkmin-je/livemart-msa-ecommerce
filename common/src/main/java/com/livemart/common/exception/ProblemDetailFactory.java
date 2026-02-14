package com.livemart.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import java.net.URI;
import java.time.Instant;

public final class ProblemDetailFactory {

    private ProblemDetailFactory() {}

    public static ProblemDetail create(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    public static ProblemDetail create(HttpStatus status, String title, String detail, URI type) {
        ProblemDetail problem = create(status, title, detail);
        problem.setType(type);
        return problem;
    }

    public static ProblemDetail notFound(String resource, Object id) {
        return create(HttpStatus.NOT_FOUND, resource + " Not Found",
                resource + " with id '" + id + "' was not found");
    }

    public static ProblemDetail conflict(String detail) {
        return create(HttpStatus.CONFLICT, "Conflict", detail);
    }

    public static ProblemDetail badRequest(String detail) {
        return create(HttpStatus.BAD_REQUEST, "Bad Request", detail);
    }

    public static ProblemDetail unauthorized(String detail) {
        return create(HttpStatus.UNAUTHORIZED, "Unauthorized", detail);
    }

    public static ProblemDetail forbidden(String detail) {
        return create(HttpStatus.FORBIDDEN, "Forbidden", detail);
    }

    public static ProblemDetail tooManyRequests(String detail) {
        return create(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", detail);
    }

    public static ProblemDetail serviceUnavailable(String detail) {
        return create(HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", detail);
    }
}
