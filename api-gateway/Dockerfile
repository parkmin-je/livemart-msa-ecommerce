FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 비루트 사용자 생성 — 컨테이너 권한 최소화
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY build/libs/*.jar app.jar

# 소유권 이전
RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8080

# 컨테이너 메모리 인식 + GC 최적화 + 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseG1GC", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
