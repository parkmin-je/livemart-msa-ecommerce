# 🛒 LiveMart - MSA 기반 E-Commerce 학습 프로젝트

[![Java](https://img.shields.io/badge/Java-21-orange)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.1-brightgreen)](https://spring.io/projects/spring-boot)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**마이크로서비스 아키텍처(MSA)와 분산 시스템 패턴을 학습하기 위한 개인 프로젝트입니다.**

> ⚠️ **학습 목적 프로젝트**: 이 프로젝트는 실제 상용 서비스가 아니며, MSA 구조와 분산 트랜잭션 패턴을 학습하고 구현 역량을 쌓기 위해 개발되었습니다.

## 🎯 프로젝트 목표

1. **MSA 아키텍처 이해**: Eureka, API Gateway, Config Server를 활용한 마이크로서비스 구성
2. **분산 트랜잭션 구현**: Saga Pattern을 통한 분산 환경에서의 데이터 일관성 처리
3. **동시성 제어 학습**: Redis 분산 락과 JPA 비관적 락을 통한 재고 관리
4. **이벤트 기반 통신**: Kafka를 활용한 서비스 간 비동기 메시징
5. **DevOps 파이프라인**: Docker, Kubernetes, GitHub Actions를 통한 배포 자동화

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│         (Routing, Load Balancing)                       │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌─────▼──────┐    ┌─────▼──────┐
   │  User   │      │  Product   │    │   Order    │
   │ Service │      │  Service   │    │  Service   │
   └────┬────┘      └─────┬──────┘    └─────┬──────┘
        │                 │                  │
        └─────────────────┼──────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Kafka Event Bus     │
              └───────────┬───────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
   │ Payment │      │Inventory│      │Analytics│
   │ Service │      │ Service │      │ Service │
   └─────────┘      └─────────┘      └─────────┘
```

### 주요 구성 요소

- **7개 마이크로서비스**: User, Product, Order, Payment, Inventory, Notification, Analytics
- **Service Discovery**: Eureka Server
- **API Gateway**: Spring Cloud Gateway
- **중앙 설정 관리**: Config Server
- **메시지 브로커**: Apache Kafka

## 📚 구현된 핵심 패턴

### 1. Saga Pattern (보상 트랜잭션)
- **Order Service**: 주문 생성 → Payment 호출 → Inventory 차감
- **실패 시 보상**: Payment 취소 → Inventory 복구 → Order 실패 처리
- **구현 방식**: Orchestration 패턴 (Order Service가 조율자 역할)

### 2. 분산 락 (Redis + Redisson)
```java
// 재고 차감 시 동시성 제어
RLock lock = redissonClient.getLock("inventory:" + productId);
try {
    lock.lock(10, TimeUnit.SECONDS);
    // 재고 차감 로직
} finally {
    lock.unlock();
}
```

### 3. Event Sourcing
- 모든 도메인 이벤트를 Kafka에 발행
- 서비스 간 느슨한 결합 유지
- 이벤트 기반 데이터 동기화

### 4. CQRS (명령-조회 분리)
- **Command**: Write DB (MySQL)
- **Query**: Read DB (Redis Cache + Elasticsearch)

## 🔧 기술 스택

### Core (실무 수준)
- **Java 21**: Virtual Threads, Record 활용
- **Spring Boot 3.4.1**: 최신 Spring Framework
- **Spring Cloud**: Eureka, Gateway, Config Server
- **PostgreSQL**: 각 서비스별 독립 데이터베이스
- **Redis**: 분산 락, 캐싱
- **Kafka**: 이벤트 기반 메시징

### Familiar (학습 및 구현 경험)
- **Docker & Docker Compose**: 로컬 개발 환경 구성
- **Kubernetes + Helm**: 배포 매니페스트 작성
- **GitHub Actions**: CI/CD 파이프라인 구성
- **Prometheus + Grafana**: 메트릭 수집 및 모니터링 설정

### Learning (현재 학습 중)
- **Elasticsearch**: 상품 검색 기능
- **Zipkin**: 분산 추적
- **WebFlux**: 반응형 프로그래밍

## 🚀 로컬 실행 방법

### 필수 요구사항
- Java 21+
- Docker & Docker Compose
- Gradle 8.0+
- PostgreSQL 15+ (Docker로 실행 가능)
- Redis 7+ (Docker로 실행 가능)

### 1. 인프라 시작
```bash
# PostgreSQL, Redis, Kafka 시작
docker-compose -f docker-compose-infra.yml up -d

# 데이터베이스 초기화
./init-databases.bat
```

### 2. 서비스 실행 (순서 중요)
```bash
# 1. Eureka Server (서비스 디스커버리)
cd eureka-server && ./gradlew bootRun &

# 2. Config Server (설정 서버)
cd config-server && ./gradlew bootRun &

# 3. API Gateway
cd api-gateway && ./gradlew bootRun &

# 4. 비즈니스 서비스들
cd user-service && ./gradlew bootRun &
cd product-service && ./gradlew bootRun &
cd order-service && ./gradlew bootRun &
cd payment-service && ./gradlew bootRun &
```

### 3. Health Check
```bash
# 각 서비스 상태 확인
curl http://localhost:8761  # Eureka Dashboard
curl http://localhost:8080/actuator/health  # API Gateway
```

## 📖 학습 과정에서 겪은 주요 문제와 해결

### 1. Redis Cluster vs Standalone
- **문제**: 로컬에서 단일 Redis 사용하는데 Cluster 설정으로 인한 연결 실패
- **해결**: 환경별 설정 분리, Standalone 모드로 전환
- **학습**: 프로덕션과 개발 환경의 차이 이해

### 2. Feign Client 경로 불일치
- **문제**: Order Service → Payment Service 호출 시 404 에러
- **원인**: `/api/payments` vs `/api/v1/payments` 경로 불일치
- **해결**: API 버전 관리 컨벤션 정립

### 3. Payment DTO 필드명 매핑 오류
- **문제**: 프론트엔드 `method` → 백엔드 `paymentMethod` 불일치
- **해결**: DTO 레이어에서 필드명 변환 처리
- **학습**: 계약 기반 API 설계의 중요성

## 🧪 테스트

```bash
# 단위 테스트
./gradlew test

# 전체 빌드 (테스트 포함)
./gradlew build
```

## 📦 배포

### Docker 이미지 빌드
```bash
# 각 서비스별 이미지 빌드
./gradlew bootBuildImage
```

### Kubernetes 배포
```bash
# Helm 차트로 배포
helm install livemart ./helm/livemart \
  --namespace livemart \
  --create-namespace
```

## 📊 프로젝트 진행 상황

- [x] MSA 기본 구조 구축 (Eureka, Gateway, Config)
- [x] User Service (회원가입, 로그인, JWT)
- [x] Product Service (상품 CRUD)
- [x] Order Service (주문 생성, Saga Pattern)
- [x] Payment Service (결제 처리, 취소)
- [x] Inventory Service (재고 관리, 분산 락)
- [x] Kafka 이벤트 기반 통신
- [x] Docker Compose 로컬 환경
- [x] Kubernetes Helm 차트
- [ ] 통합 테스트 자동화
- [ ] 성능 테스트 및 최적화
- [ ] Elasticsearch 검색 고도화
- [ ] 모니터링 대시보드 구축

## 🛠️ 개발 환경

- **IDE**: IntelliJ IDEA 2025.3.2
- **JDK**: OpenJDK 21
- **Build Tool**: Gradle 8.5
- **Container**: Docker Desktop 4.x
- **OS**: Windows 11 + WSL2

## 🤝 AI 도구 활용

이 프로젝트는 **Claude (Anthropic AI)**를 학습 보조 도구로 활용하여 개발되었습니다.

### 활용 방식
- **아키텍처 설계**: MSA 구조 설계 시 베스트 프랙티스 학습
- **문제 해결**: 에러 디버깅 및 해결 방법 탐색
- **코드 리뷰**: 구현한 코드에 대한 피드백 및 개선 제안
- **학습 가이드**: Spring Cloud, Kafka 등 새로운 기술 학습

> 💡 **학습 목적**: AI는 학습 도구로 사용되었으며, 모든 핵심 로직은 직접 이해하고 구현했습니다. 면접 시 모든 구현 내용에 대해 설명 가능합니다.

## 📝 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 개발자

**박민제 (parkmin-je)**
- GitHub: [@parkmin-je](https://github.com/parkmin-je)
- 목표: 백엔드 개발자 (MSA, 분산 시스템)

---

**2024-2026 개인 학습 프로젝트**
