# ✅ livemart-clean 프로젝트 설정 완료

## 📌 수행 작업

### 1. Windows 명령줄 길이 문제 해결

#### gradle.properties 설정
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.java.compile-classpath-packaging=true  # ← 핵심 설정
```

#### IntelliJ Run Configuration 설정
모든 Spring Boot 애플리케이션에 다음 설정 추가됨:
```xml
<option name="SHORTEN_COMMAND_LINE" value="JAR_MANIFEST" />
```

적용된 서비스:
- AnalyticsServiceApplication
- ApiGatewayApplication
- ConfigServerApplication
- EurekaServerApplication
- InventoryServiceApplication
- NotificationServiceApplication
- OrderServiceApplication
- PaymentServiceApplication
- ProductServiceApplication
- UserServiceApplication

### 2. 프로젝트 구조 검증

모든 서비스 메인 클래스 확인 완료:
```
✓ analytics-service/src/main/java/com/livemart/analytics/AnalyticsServiceApplication.java
✓ api-gateway/src/main/java/com/livemart/apigateway/ApiGatewayApplication.java
✓ config-server/src/main/java/com/livemart/config/ConfigServerApplication.java
✓ eureka-server/src/main/java/com/livemart/eureka/EurekaServerApplication.java
✓ inventory-service/src/main/java/com/livemart/inventory/InventoryServiceApplication.java
✓ notification-service/src/main/java/com/livemart/notification/NotificationServiceApplication.java
✓ order-service/src/main/java/com/livemart/order/OrderServiceApplication.java
✓ payment-service/src/main/java/com/livemart/payment/PaymentServiceApplication.java
✓ product-service/src/main/java/com/livemart/product/ProductServiceApplication.java
✓ user-service/src/main/java/com/livemart/user/UserServiceApplication.java
```

### 3. 서비스 포트 매핑 확인

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Eureka Server | 8761 | 서비스 디스커버리 |
| Config Server | 8888 | 중앙 설정 관리 |
| API Gateway | 8080 | API 게이트웨이 |
| User Service | 8085 | 사용자 관리 |
| Product Service | 8082 | 상품 관리 (gRPC: 9095) |
| Order Service | 8083 | 주문 관리 |
| Payment Service | 8084 | 결제 처리 |
| Inventory Service | 8088 | 재고 관리 |
| Notification Service | 8086 | 알림 발송 |
| Analytics Service | 8087 | 분석/통계 |

### 4. 데이터베이스 포트 매핑

| 서비스 | DB 포트 | DB 이름 |
|--------|---------|---------|
| User Service | 5434 | userdb |
| Product Service | 5435 | productdb |
| Order Service | 5436 | orderdb |
| Payment Service | 5437 | paymentdb |
| Inventory Service | 5438 | inventorydb |

## 🎯 다음 단계

### IntelliJ에서 프로젝트 열기

1. IntelliJ IDEA에서 `C:\project\livemart-clean` 폴더 열기
2. IntelliJ가 자동으로 Gradle wrapper 다운로드 및 프로젝트 인덱싱
3. 프로젝트 로드 완료까지 대기 (약 2-3분)

### 서비스 시작

**SERVICE_STARTUP_GUIDE.md 파일을 참고하여 다음 순서로 실행:**

1. **인프라 시작**
   ```bash
   docker-compose -f docker-compose-infra.yml up -d
   ```

2. **Eureka Server 시작** (20초 대기)
3. **Config Server 시작** (15초 대기)
4. **API Gateway 시작** (20초 대기)
5. **비즈니스 서비스들 시작** (User, Product, Order, Payment, Inventory, Notification, Analytics)

### 동작 확인

- **Eureka Dashboard**: http://localhost:8761
- **API Gateway Health**: http://localhost:8080/actuator/health

## ⚠️ 주의사항

### Gradle Wrapper

IntelliJ가 프로젝트를 처음 열 때 자동으로 Gradle wrapper를 다운로드합니다:
- 파일: `gradle/wrapper/gradle-wrapper.jar`
- 버전: Gradle 8.10.2

**만약 IntelliJ에서 Gradle wrapper 다운로드 실패 시:**
1. File → Invalidate Caches / Restart
2. File → Settings → Build, Execution, Deployment → Build Tools → Gradle
3. "Use Gradle from" → **gradle-wrapper.properties file (recommended)** 선택

### "명령줄이 너무 깁니다" 오류 재발 시

1. IntelliJ 재시작
2. Run → Edit Configurations
3. 해당 서비스 선택
4. "Shorten command line" → **JAR manifest** 선택

## 📋 설정 파일 요약

### 생성된 파일
- `gradle.properties` - Gradle 설정 (classpath packaging)
- `.idea/workspace.xml` - IntelliJ Run Configurations
- `SERVICE_STARTUP_GUIDE.md` - 서비스 시작 가이드
- `SETUP_COMPLETE.md` - 이 문서

### 핵심 설정 내용

**gradle.properties:**
```properties
org.gradle.java.compile-classpath-packaging=true
```

**workspace.xml (각 서비스마다):**
```xml
<option name="SHORTEN_COMMAND_LINE" value="JAR_MANIFEST" />
```

## ✅ 검증 완료 항목

- [x] Gradle wrapper 설정 확인 (8.10.2)
- [x] 모든 서비스 메인 클래스 존재 확인
- [x] gradle.properties 생성 및 설정
- [x] IntelliJ Run Configuration 설정 (10개 서비스)
- [x] 서비스 포트 매핑 검증
- [x] API Gateway 라우팅 설정 확인
- [x] 데이터베이스 포트 충돌 없음 확인

## 🚀 준비 완료!

이제 IntelliJ IDEA에서 프로젝트를 열고 SERVICE_STARTUP_GUIDE.md를 따라 서비스를 시작하면 됩니다.

**"명령줄이 너무 깁니다" 오류 없이 모든 서비스가 정상 실행될 것입니다!**

---

**작업 완료 시간**: 2026-02-19
**설정 버전**: livemart-clean v2.0.0
