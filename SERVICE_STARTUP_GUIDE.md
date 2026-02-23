# 서비스 시작 가이드

## ⚠️ 중요 사항

"명령줄이 너무 깁니다" 오류가 발생하지 않도록 모든 설정이 완료되었습니다.

## 🔧 적용된 해결 방법

### 1. gradle.properties
```properties
org.gradle.java.compile-classpath-packaging=true
```

### 2. IntelliJ Run Configuration
모든 Spring Boot 애플리케이션에 `SHORTEN_COMMAND_LINE = JAR_MANIFEST` 적용

## 🚀 서비스 실행 순서

### 1단계: 인프라 서비스

```bash
# Docker Compose로 PostgreSQL, Redis, Kafka 시작
docker-compose -f docker-compose-infra.yml up -d
```

### 2단계: 서비스 디스커버리 & 설정

**IntelliJ에서 실행:**

1. **Eureka Server** (포트: 8761)
   - Run → EurekaServerApplication
   - 대기: 약 20초
   - 확인: http://localhost:8761

2. **Config Server** (포트: 8888)
   - Run → ConfigServerApplication
   - 대기: 약 15초

### 3단계: API Gateway

3. **API Gateway** (포트: 8080)
   - Run → ApiGatewayApplication
   - 대기: 약 20초
   - 확인: http://localhost:8080/actuator/health

### 4단계: 비즈니스 서비스

4. **User Service** (포트: 8085)
   - Run → UserServiceApplication

5. **Product Service** (포트: 8082)
   - Run → ProductServiceApplication

6. **Order Service** (포트: 8083)
   - Run → OrderServiceApplication

7. **Payment Service** (포트: 8084)
   - Run → PaymentServiceApplication

8. **Inventory Service** (포트: 8088)
   - Run → InventoryServiceApplication

9. **Notification Service** (포트: 8086)
   - Run → NotificationServiceApplication

10. **Analytics Service** (포트: 8087)
   - Run → AnalyticsServiceApplication

## 🔍 서비스 상태 확인

```bash
# Eureka Dashboard에서 모든 서비스 확인
http://localhost:8761

# 각 서비스 Health Check
curl http://localhost:8080/actuator/health  # API Gateway
curl http://localhost:8085/actuator/health  # User Service
curl http://localhost:8082/actuator/health  # Product Service
curl http://localhost:8083/actuator/health  # Order Service
curl http://localhost:8084/actuator/health  # Payment Service
curl http://localhost:8088/actuator/health  # Inventory Service
curl http://localhost:8086/actuator/health  # Notification Service
curl http://localhost:8087/actuator/health  # Analytics Service
```

## 💡 트러블슈팅

### "명령줄이 너무 깁니다" 오류 발생 시

1. **IntelliJ 재시작**
2. **File → Invalidate Caches / Restart**
3. **Run Configuration 확인:**
   - Run → Edit Configurations
   - 해당 서비스 선택
   - "Shorten command line" 드롭다운에서 **"JAR manifest"** 선택

### Gradle wrapper 오류 발생 시

IntelliJ가 자동으로 Gradle wrapper를 다운로드합니다:
- File → Settings → Build, Execution, Deployment → Build Tools → Gradle
- "Use Gradle from" → gradle-wrapper.properties file (recommended)

### 포트 충돌 시

```bash
# 해당 포트 사용 중인 프로세스 확인
netstat -ano | findstr :8761
# PID로 프로세스 종료
taskkill /F /PID <PID>
```

## 📊 실행 확인 체크리스트

- [ ] Docker 인프라 실행 (PostgreSQL, Redis, Kafka)
- [ ] Eureka Server 실행 및 대시보드 접속 확인
- [ ] Config Server 실행
- [ ] API Gateway 실행 및 Health Check 확인
- [ ] User Service (8085) 실행 및 Eureka 등록 확인
- [ ] Product Service (8082) 실행 및 Eureka 등록 확인
- [ ] Order Service (8083) 실행 및 Eureka 등록 확인
- [ ] Payment Service (8084) 실행 및 Eureka 등록 확인
- [ ] Inventory Service (8088) 실행 및 Eureka 등록 확인
- [ ] Notification Service (8086) 실행 및 Eureka 등록 확인
- [ ] Analytics Service (8087) 실행 및 Eureka 등록 확인

## ✅ 모든 서비스가 정상 실행되면

http://localhost:8761 에서 모든 서비스가 "UP" 상태인지 확인하세요!

---

**준비 완료!** 이제 서비스를 IntelliJ에서 실행하시면 "명령줄이 너무 깁니다" 오류 없이 정상 작동합니다.
