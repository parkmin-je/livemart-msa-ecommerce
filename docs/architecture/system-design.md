# LiveMart — System Design

> C4 Model 기반 아키텍처 문서 (Context → Container → Component)

---

## Level 1: System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LiveMart Platform                            │
│                                                                     │
│  ┌──────────┐    HTTPS     ┌───────────────────────────────────┐   │
│  │  Customer│─────────────▶│         LiveMart Frontend          │   │
│  │ (Browser)│              │  Next.js 15 / Vercel CDN           │   │
│  └──────────┘              └──────────────┬────────────────────┘   │
│                                           │ API calls              │
│  ┌──────────┐    HTTPS     ┌──────────────▼────────────────────┐   │
│  │  Seller  │─────────────▶│         API Gateway               │   │
│  │(Admin UI)│              │  Spring Cloud Gateway :8080        │   │
│  └──────────┘              └──────────────┬────────────────────┘   │
│                                           │                        │
│  ┌──────────┐              ┌──────────────▼────────────────────┐   │
│  │  Stripe  │◀────webhook──│      Microservices Cluster         │   │
│  │  (PG)    │              │      (10 services, Kubernetes)     │   │
│  └──────────┘              └───────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Level 2: Container Diagram

```
┌─────────────────────────────────────────── Kubernetes Cluster (livemart ns) ──────────────────────────────────────┐
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Ingress (NGINX) + Istio Gateway                                                                             │  │
│  └─────────────────────────────────┬───────────────────────────────────────────────────────────────────────────┘  │
│                                    │ mTLS (Istio STRICT)                                                           │
│  ┌──────────────────────────┐      │                                                                               │
│  │   api-gateway  :8080     │◀─────┘                                                                               │
│  │  Rate Limit (Redis)      │                                                                                       │
│  │  JWT Cookie 검증          │                                                                                       │
│  │  Circuit Breaker         │                                                                                       │
│  │  Service Discovery       │                                                                                       │
│  └──────┬─────────┬─────────┘                                                                                       │
│         │ REST    │ REST                                                                                             │
│  ┌──────▼──────┐ ┌▼──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │order-service│ │product-service│ │payment-service│ │ user-service  │ │inventory-svc │ │analytics-svc │           │
│  │    :8083    │ │    :8082      │ │    :8084      │ │    :8085      │ │    :8088     │ │    :8087     │           │
│  │             │ │               │ │               │ │               │ │              │ │              │           │
│  │ Saga        │ │ Elasticsearch │ │ Stripe        │ │ JWT/OAuth2    │ │ Redisson Lock│ │ A/B Test     │           │
│  │ Outbox      │ │ gRPC Server   │ │ Idempotency   │ │ MFA (TOTP)    │ │ Auto-reorder │ │ Dashboard    │           │
│  │ CQRS        │ │ GraphQL       │ │ DLQ           │ │ Audit Log     │ │              │ │ Spring Batch │           │
│  │ Spring Batch│ │ WebSocket     │ │               │ │               │ │              │ │              │           │
│  └──────┬──────┘ └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └──────┬───────┘ └──────────────┘           │
│         │                │ gRPC             │                 │                │                                     │
│  ┌──────▼─── Kafka (order-events / payment-events / stock-events / *.DLT) ──────────────────────────────────────┐  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │notification  │ │  ai-service  │ │eureka-server │ │config-server │ │  PostgreSQL  │ │    Redis     │           │
│  │    :8086     │ │    :8090     │ │    :8761     │ │    :8888     │ │  × 5 DBs     │ │  Cache/RL/BL │           │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                                                                     │
│  ┌─────────────────────── Observability ──────────────────────────────────────────────────────────────────────┐  │
│  │  Prometheus  ──▶  Grafana        │   OpenTelemetry (OTLP)  ──▶  Zipkin (Traces)                            │  │
│  │  Logstash    ──▶  Elasticsearch  ──▶  Kibana                                                                │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Level 3: Component — order-service

```
order-service
├── controller/
│   ├── OrderController         POST /api/orders, GET /api/orders/{id}
│   ├── OrderReturnController   POST /api/orders/{id}/returns
│   └── OrderAdminController    Admin APIs (Spring Security role-based)
│
├── service/
│   ├── OrderService            핵심 비즈니스 로직 (주문 생성/취소/조회)
│   ├── SagaCoordinator         Kafka 이벤트 구독 → 보상 트랜잭션 조율
│   ├── CouponService           쿠폰 유효성 검증 + 적용
│   └── ReturnService           반품 요청 처리
│
├── aspect/
│   └── OrderMetricsAspect      AOP: Prometheus 비즈니스 메트릭 수집
│
├── event/
│   ├── OrderEventPublisher     Outbox 경유 Kafka 발행
│   └── PaymentEventHandler     payment-events 구독 → 주문 상태 업데이트
│
├── cqrs/
│   ├── OrderCommandService     쓰기 모델 (Command)
│   └── OrderQueryService       읽기 모델 (Query) — 별도 Read DB 가능
│
├── batch/
│   └── DailySettlementJob      일별 정산 Spring Batch Job
│
├── repository/
│   ├── OrderRepository         JPA (PostgreSQL)
│   └── OrderReadRepository     QueryDSL 읽기 전용
│
└── domain/
    ├── Order                   Aggregate Root
    ├── OrderItem               Value Object
    ├── OrderStatus             Enum (PENDING/CONFIRMED/CANCELLED/REFUNDED)
    └── Money                   Value Object (금액, 통화)
```

---

## Level 3: Component — payment-service

```
payment-service
├── controller/
│   ├── PaymentController       POST /api/payments, GET /api/payments/{id}
│   └── WebhookController       POST /api/payments/webhook (Stripe)
│
├── service/
│   ├── PaymentService          Stripe API 연동 + 멱등성 처리
│   ├── RefundService           환불 처리 (Partial/Full)
│   └── WebhookService          Stripe Webhook 서명 검증 + 처리
│
├── event/
│   └── PaymentEventPublisher   Kafka payment-events 발행
│       └── DLQ Recovery        *.DLT 메시지 재처리 (Admin API)
│
└── domain/
    ├── Payment                 Aggregate (idempotency key 포함)
    ├── PaymentStatus           Enum
    └── RefundRequest           Value Object
```

---

## Data Flow: 주문 생성 (Saga)

```
Client
  │ POST /api/orders
  ▼
api-gateway ──[JWT 검증, Rate Limit]──▶ order-service
                                              │
                          ┌───────────────────┴────────────────────────┐
                          │ @Transactional                              │
                          │  1. orders 테이블 INSERT (PENDING)           │
                          │  2. outbox_events 테이블 INSERT             │
                          └──────────────────┬─────────────────────────┘
                                             │ 201 Created (즉시 응답)
                          OutboxProcessor (500ms 폴링)
                                             │ kafkaTemplate.send().get(5s)
                                             ▼
                                    Kafka: order-events
                                             │
                          ┌──────────────────┴──────────────────┐
                          │                                      │
                  payment-service                      product-service
                  결제 처리 (Stripe)                   재고 차감 (Redisson)
                          │                                      │
                  Kafka: payment-events              Kafka: stock-events
                  (PAYMENT_COMPLETED)                (STOCK_DEDUCTED)
                          │
                  order-service
                  ORDER_CONFIRMED 업데이트
                          │
                  notification-service
                  이메일/푸시 알림 발송
```

---

## 동시성 제어 전략

```
┌─────────────────────────────────────────────────────────┐
│ 시나리오                │ 전략                  │ 위치   │
├─────────────────────────┼───────────────────────┼────────┤
│ 플래시 세일 재고 동시 주문 │ Redisson 분산 락       │ K8s    │
│ (500 VU, 100개 재고)    │ (stock:productId:{id}) │        │
├─────────────────────────┼───────────────────────┼────────┤
│ Rate Limiting           │ Redis Token Bucket     │ GW     │
│ (100 RPS / 20 RPS)      │ (Gateway Filter)       │        │
├─────────────────────────┼───────────────────────┼────────┤
│ 결제 중복 청구 방지       │ Idempotency Key Header │ PG     │
│                         │ (Stripe + DB 검증)     │        │
├─────────────────────────┼───────────────────────┼────────┤
│ Saga 보상 트랜잭션        │ Kafka DLQ +           │ Kafka  │
│                         │ ExponentialBackOff     │        │
│                         │ 1s→2s→4s, 3회          │        │
└─────────────────────────┴───────────────────────┴────────┘
```

---

## 데이터베이스 설계 원칙

- **Database-per-Service**: 5개 독립 PostgreSQL 인스턴스
- 서비스 간 직접 DB 공유 금지 — API 또는 Kafka 이벤트 경유만 허용
- **Flyway** 마이그레이션으로 스키마 버전 관리
- 읽기 성능: Redis Cache-Aside (TTL 60s 상품, TTL 300s 카테고리)
- Elasticsearch: 검색 전용 read store (nori 형태소 분석기)

---

## 관련 문서

- [ADR-001 Saga Choreography](../adr/ADR-001-saga-pattern.md)
- [ADR-002 Transactional Outbox](../adr/ADR-002-outbox-pattern.md)
- [ADR-003 gRPC Product Query](../adr/ADR-003-grpc-product-query.md)
- [ADR-004 Redis Caching Strategy](../adr/ADR-004-redis-caching-strategy.md)
- [ADR-005 Elasticsearch Search](../adr/ADR-005-elasticsearch-search.md)
- [ADR-006 Istio Service Mesh](../adr/ADR-006-istio-service-mesh.md)
- [On-Call Runbook](../runbooks/on-call-runbook.md)
- [PERFORMANCE.md](../../PERFORMANCE.md)
