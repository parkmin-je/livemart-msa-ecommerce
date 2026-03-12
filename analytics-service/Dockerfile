FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 보안: non-root 유저
RUN addgroup -S livemart && adduser -S livemart -G livemart
USER livemart

COPY build/libs/analytics-service-*.jar app.jar

EXPOSE 8087
ENTRYPOINT ["java", "--enable-preview", "-jar", "app.jar"]
