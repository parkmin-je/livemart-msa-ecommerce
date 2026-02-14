package com.livemart.common.audit;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;

@Slf4j
@Aspect
@Component
public class AuditLogAspect {

    @Around("@annotation(auditLog)")
    public Object audit(ProceedingJoinPoint joinPoint, AuditLog auditLog) throws Throwable {
        var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        String ip = attrs != null ? attrs.getRequest().getRemoteAddr() : "unknown";
        String method = joinPoint.getSignature().toShortString();

        Instant start = Instant.now();
        try {
            Object result = joinPoint.proceed();
            log.info("[AUDIT] action={} resource={} method={} ip={} status=SUCCESS duration={}ms",
                    auditLog.action(), auditLog.resource(), method, ip,
                    Instant.now().toEpochMilli() - start.toEpochMilli());
            return result;
        } catch (Exception e) {
            log.warn("[AUDIT] action={} resource={} method={} ip={} status=FAILURE error={}",
                    auditLog.action(), auditLog.resource(), method, ip, e.getMessage());
            throw e;
        }
    }
}
