FROM gradle:8.11-jdk21-alpine AS build
WORKDIR /app
COPY . .
RUN chmod +x ./gradlew && \
    ./gradlew :product-service:generateProto --no-daemon 2>&1 || true && \
    find /home/gradle/.gradle -name "protoc-gen-grpc-java*.exe" -exec chmod +x {} \; && \
    ./gradlew :product-service:bootJar -x test --no-daemon -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/product-service/build/libs/product-service-2.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-c", "java --enable-preview -jar app.jar --spring.profiles.active=render 2>&1"]
