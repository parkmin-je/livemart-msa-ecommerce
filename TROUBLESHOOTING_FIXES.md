# 🔧 서비스 실행 오류 해결 완료

## 문제 발견 및 해결 (2026-02-19 15:48)

### ✅ 해결된 서비스: 2개

---

## 1. Analytics Service - 데이터베이스 인증 실패

### 증상
```
FATAL: password authentication failed for user "analyticsapp"
org.postgresql.util.PSQLException: FATAL: password authentication failed for user "analyticsapp"
```

### 원인
Analytics PostgreSQL 컨테이너가 실행 중이었으나, 데이터베이스 사용자 `analyticsapp`이 생성되지 않은 상태였습니다.

### 해결 방법
DB 컨테이너를 재생성하여 환경변수에 따라 사용자와 데이터베이스를 정상 생성:

```bash
# 기존 컨테이너 제거
docker stop livemart-postgres-analytics
docker rm livemart-postgres-analytics

# 새 컨테이너 생성 (올바른 환경변수로)
docker run -d \
  --name livemart-postgres-analytics \
  -e POSTGRES_DB=analyticsdb \
  -e POSTGRES_USER=analyticsapp \
  -e POSTGRES_PASSWORD=analytics123 \
  -p 5433:5432 \
  --network docker_livemart-network \
  -v livemart-clean_postgres-analytics-data:/var/lib/postgresql/data \
  postgres:15
```

### 검증
```bash
docker exec livemart-postgres-analytics psql -U analyticsapp -d analyticsdb -c "\l"
```

결과: **✅ 연결 성공**
```
    Name     |    Owner     | Encoding |  Collate   |   Ctype
-------------+--------------+----------+------------+------------
 analyticsdb | analyticsapp | UTF8     | en_US.utf8 | en_US.utf8
```

### 현재 상태
- **포트**: 5433
- **데이터베이스**: analyticsdb
- **사용자**: analyticsapp / analytics123
- **상태**: 🟢 정상 작동

---

## 2. Inventory Service - Redis Bean 중복 정의

### 증상
```
The bean 'stringRedisTemplate', defined in class path resource
[org/redisson/spring/starter/RedissonAutoConfigurationV2.class],
could not be registered. A bean with that name has already been defined
in class path resource [com/livemart/common/config/RedisConfig.class]
and overriding is disabled.
```

### 원인
- `common` 모듈의 `RedisConfig`에서 `stringRedisTemplate` Bean 정의
- Inventory Service가 Redisson 라이브러리를 사용하는데, Redisson도 같은 이름의 Bean을 자동 생성
- Spring Boot의 Bean overriding이 기본적으로 비활성화되어 충돌 발생

### 해결 방법
Inventory Service의 `application.yml`에 Bean overriding 허용 설정 추가:

```yaml
spring:
  application:
    name: inventory-service
  main:
    allow-bean-definition-overriding: true  # ← 추가
  threads:
    virtual:
      enabled: true
```

### 파일 경로
`C:\project\livemart-clean\inventory-service\src\main\resources\application.yml`

### 추가 문제 발견 및 해결

**문제**: Bean overriding 설정 후에도 DB 연결 실패
```
Connection to localhost:5438 refused
```

**원인**: Inventory PostgreSQL 컨테이너가 잘못된 포트 (5432)로 매핑되어 있었음
```bash
# 잘못된 매핑
livemart-postgres-inventory   0.0.0.0:5432->5432/tcp  # ❌ 5432는 다른 서비스용
```

**해결**: 컨테이너를 올바른 포트 (5438)로 재생성
```bash
docker stop livemart-postgres-inventory
docker rm livemart-postgres-inventory

docker run -d \
  --name livemart-postgres-inventory \
  -e POSTGRES_DB=inventorydb \
  -e POSTGRES_USER=inventoryapp \
  -e POSTGRES_PASSWORD=inventory123 \
  -p 5438:5432 \
  --network docker_livemart-network \
  -v livemart-clean_postgres-inventory-data:/var/lib/postgresql/data \
  postgres:15
```

### 추가 문제 #2: JPA Repository 스캔 실패

**문제**: Bean overriding과 DB 연결 해결 후에도 실패
```
No qualifying bean of type 'com.livemart.common.outbox.OutboxEventRepository' available
```

**원인**: `@SpringBootApplication`의 `scanBasePackages`는 `@Component`, `@Service` 등은 스캔하지만, **JPA Repository는 별도 설정 필요**

**해결**: `@EnableJpaRepositories` 추가로 common 모듈의 Repository도 스캔

### 추가 문제 #3: JPA Entity 스캔 실패

**문제**: Repository 스캔 후에도 실패
```
Not a managed type: class com.livemart.common.outbox.OutboxEvent
```

**원인**: `@EnableJpaRepositories`로 Repository는 스캔되었지만, **Entity 클래스는 `@EntityScan`으로 별도 스캔 필요**

**최종 해결**: `@EntityScan`과 `@EnableJpaRepositories` 모두 추가
```java
@SpringBootApplication(scanBasePackages = {"com.livemart.inventory", "com.livemart.common"})
@EntityScan(basePackages = {"com.livemart.inventory.domain", "com.livemart.common.outbox"})
@EnableJpaRepositories(basePackages = {"com.livemart.inventory.repository", "com.livemart.common.outbox"})
@EnableDiscoveryClient
@EnableScheduling
public class InventoryServiceApplication {
    // ...
}
```

### 추가 문제 #4: KafkaTemplate Bean 타입 불일치

**문제**: Entity와 Repository 스캔 해결 후에도 실패
```
No qualifying bean of type 'org.springframework.kafka.core.KafkaTemplate<java.lang.String, java.lang.Object>' available
```

**원인**: KafkaConfig에 `KafkaTemplate<String, String>`만 정의되어 있었고, `LowStockAlertService`는 `KafkaTemplate<String, Object>` 필요

**해결**: Object 타입 KafkaTemplate Bean 추가
```java
@Bean
public ProducerFactory<String, Object> objectProducerFactory() {
    return new DefaultKafkaProducerFactory<>(Map.of(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers,
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class,
            ProducerConfig.ACKS_CONFIG, "all",
            ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true
    ));
}

@Bean
public KafkaTemplate<String, Object> objectKafkaTemplate() {
    return new KafkaTemplate<>(objectProducerFactory());
}
```

### 현재 상태
- **포트**: 8088
- **데이터베이스**: inventorydb (포트 5438) ✅ 재생성 완료
- **Redis**: localhost:6379
- **Kafka**: localhost:9092
- **상태**: 🟢 모든 문제 해결 (5가지 문제 수정 완료), 재실행 준비 완료

---

## 📊 전체 서비스 상태

| 서비스 | 포트 | 상태 | 비고 |
|--------|------|------|------|
| Eureka Server | 8761 | ✅ 정상 | - |
| Config Server | 8888 | ✅ 정상 | - |
| API Gateway | 8080 | ✅ 정상 | - |
| User Service | 8085 | ✅ 정상 | - |
| Product Service | 8082 | ✅ 정상 | - |
| Order Service | 8083 | ✅ 정상 | - |
| Payment Service | 8084 | ✅ 정상 | - |
| Notification Service | 8086 | ✅ 정상 | - |
| **Analytics Service** | **8087** | **🔧 수정 완료** | DB 재생성 (포트 5433) |
| **Inventory Service** | **8088** | **🔧 수정 완료** | Bean overriding + DB 재생성 (포트 5438) |

## 🚀 다음 단계

### Analytics Service 재시작
IntelliJ에서 **AnalyticsServiceApplication**을 다시 실행:
- 예상 결과: 정상 시작, Eureka 등록 성공

### Inventory Service 재시작
IntelliJ에서 **InventoryServiceApplication**을 다시 실행:
- 예상 결과: Bean 충돌 없이 정상 시작

### 최종 검증
```bash
# Eureka Dashboard에서 모든 서비스 확인
http://localhost:8761

# 각 서비스 Health Check
curl http://localhost:8087/actuator/health  # Analytics Service
curl http://localhost:8088/actuator/health  # Inventory Service
```

## 📝 학습 포인트

### 1. PostgreSQL 컨테이너 초기화
- PostgreSQL 컨테이너는 **최초 실행 시에만** 환경변수를 읽어 사용자/DB 생성
- 볼륨에 데이터가 남아있으면 환경변수를 무시함
- 사용자 생성 문제는 **컨테이너 재생성**으로 해결 (`docker rm` 후 재생성)

### 2. Spring Bean 충돌 해결
- 여러 라이브러리가 같은 이름의 Bean을 생성할 수 있음
- 해결 방법 3가지:
  1. `spring.main.allow-bean-definition-overriding=true` (선택함)
  2. Bean 이름 변경 (`@Bean("customStringRedisTemplate")`)
  3. AutoConfiguration 제외 (`@SpringBootApplication(exclude = ...)`)

### 3. Docker 네트워크 이름
- docker-compose로 생성된 네트워크는 `<폴더명>_<네트워크명>` 형식
- 예: `docker_livemart-network`, `livemart_default`
- `docker network ls`로 확인 필수

### 4. Docker 포트 매핑 확인의 중요성
- 컨테이너가 실행 중이어도 **포트 매핑이 잘못되면 연결 불가**
- `docker ps`로 포트 매핑 반드시 확인
- 예: `0.0.0.0:5438->5432/tcp` (호스트:5438 → 컨테이너:5432)

### 5. Multi-Module 프로젝트의 JPA 설정
- **Component 스캔**: `@SpringBootApplication(scanBasePackages = {...})`
- **Repository 스캔**: `@EnableJpaRepositories(basePackages = {...})`
- **Entity 스캔**: `@EntityScan(basePackages = {...})`
- 세 가지 모두 필요! 하나라도 빠지면 Bean 생성 실패
- Payment Service에서는 이미 올바르게 설정되어 있었음 (참고용)

---

**작업 완료 시간**: 2026-02-19 16:13
**수정된 파일**:
1. `inventory-service/src/main/resources/application.yml` (Bean overriding 허용)
2. `inventory-service/src/main/java/com/livemart/inventory/InventoryServiceApplication.java` (@EntityScan + @EnableJpaRepositories 추가)
3. `inventory-service/src/main/java/com/livemart/inventory/config/KafkaConfig.java` (Object 타입 KafkaTemplate 추가)
4. Analytics PostgreSQL 컨테이너 재생성 (포트 5433)
5. Inventory PostgreSQL 컨테이너 재생성 (포트 5438)

**해결한 문제**:
1. ✅ Bean 중복 (stringRedisTemplate)
2. ✅ DB 연결 실패 (포트 5438)
3. ✅ JPA Repository 스캔 실패
4. ✅ JPA Entity 스캔 실패
5. ✅ KafkaTemplate 타입 불일치
