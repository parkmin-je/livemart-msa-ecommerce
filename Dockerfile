# LiveMart MSA — 단일 멀티스테이지 Dockerfile (모든 서비스 공용)
# render.yaml에서 SERVICE_NAME 빌드 인수로 서비스 지정
ARG SERVICE_NAME=api-gateway
ARG SERVICE_VERSION=2.0.0

# ── 빌드 스테이지 ────────────────────────────────────────────
FROM gradle:8.11-jdk21-alpine AS build
ARG SERVICE_NAME
ARG SERVICE_VERSION
WORKDIR /app

# 의존성 캐시 레이어 (소스 변경 시 재다운로드 방지)
COPY build.gradle settings.gradle ./
COPY gradle gradle
COPY gradlew .
COPY */build.gradle ./
RUN chmod +x ./gradlew && \
    ./gradlew :${SERVICE_NAME}:dependencies --no-daemon -q 2>/dev/null || true

# 전체 소스 복사 후 빌드
COPY . .
RUN chmod +x ./gradlew && \
    ./gradlew :${SERVICE_NAME}:bootJar -x test --no-daemon -q

# ── 실행 스테이지 ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
ARG SERVICE_NAME
ARG SERVICE_VERSION
WORKDIR /app

COPY --from=build /app/${SERVICE_NAME}/build/libs/${SERVICE_NAME}-${SERVICE_VERSION}.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Xms256m", "-Xmx400m", "-jar", "app.jar"]
