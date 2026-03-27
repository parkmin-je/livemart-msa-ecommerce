FROM gradle:8.11-jdk21-alpine AS build
WORKDIR /app
COPY . .
RUN wget -q -O /usr/local/bin/protoc-gen-grpc-java \
    https://repo1.maven.org/maven2/io/grpc/protoc-gen-grpc-java/1.80.0/protoc-gen-grpc-java-1.80.0-linux-x86_64.exe && \
    chmod +x /usr/local/bin/protoc-gen-grpc-java && \
    chmod +x ./gradlew && \
    ./gradlew :product-service:bootJar -x test --no-daemon -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/product-service/build/libs/product-service-2.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-c", "java --enable-preview -jar app.jar --spring.profiles.active=render 2>&1"]
