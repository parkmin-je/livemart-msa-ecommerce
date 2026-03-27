FROM gradle:8.11-jdk21-alpine AS build
WORKDIR /app
COPY . .
RUN chmod +x ./gradlew && ./gradlew :inventory-service:bootJar -x test --no-daemon -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/inventory-service/build/libs/inventory-service-2.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","--enable-preview","-Xms256m","-Xmx400m","-jar","app.jar","--spring.profiles.active=render"]
