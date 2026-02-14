package com.livemart.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import java.net.URI;
import java.time.Instant;

public final class ProblemDetailFactory {

    private static final String BASE_TYPE_URI = "https://api.livemart.com/problems/";

    private ProblemDetailFactory() {}

    public static ProblemDetail create(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setType(URI.create(BASE_TYPE_URI + toSlug(title)));
        problem.setProperty("timestamp", Instant.now());
        String traceId = org.slf4j.MDC.get("traceId");
        if (traceId != null) {
            problem.setProperty("traceId", traceId);
        }
        return problem;
    }

    public static ProblemDetail create(HttpStatus status, String title, String detail, URI type) {
        ProblemDetail problem = create(status, title, detail);
        problem.setType(type);
        return problem;
    }

    public static ProblemDetail notFound(String resource, Object id) {
        ProblemDetail problem = create(HttpStatus.NOT_FOUND, resource + " Not Found",
                resource + " with id '" + id + "' was not found");
        problem.setProperty("resource", resource);
        problem.setProperty("resourceId", String.valueOf(id));
        return problem;
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
        ProblemDetail problem = create(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", detail);
        problem.setProperty("retryAfter", 60);
        return problem;
    }

    public static ProblemDetail serviceUnavailable(String detail) {
        return create(HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", detail);
    }

    public static ProblemDetail concurrencyConflict(String resource, Object id) {
        ProblemDetail problem = create(HttpStatus.CONFLICT, "Concurrency Conflict",
                "The " + resource + " was modified by another request. Please retry.");
        problem.setType(URI.create(BASE_TYPE_URI + "concurrency-conflict"));
        problem.setProperty("resource", resource);
        problem.setProperty("resourceId", String.valueOf(id));
        return problem;
    }

    private static String toSlug(String title) {
        return title.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
