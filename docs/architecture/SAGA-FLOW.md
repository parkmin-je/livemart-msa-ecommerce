# Saga Choreography Flow — 주문→결제→재고

LiveMart는 분산 트랜잭션을 **Saga Choreography** 패턴으로 처리합니다.
중앙 오케스트레이터 없이 각 서비스가 이벤트를 구독·발행하여 자율 협력합니다.

## 정상 플로우

```mermaid
sequenceDiagram
    participant C as Client (Frontend)
    participant G as API Gateway
    participant O as Order Service
    participant P as Payment Service
    participant I as Inventory Service
    participant K as Kafka

    C->>G: POST /api/orders
    G->>O: 주문 생성 요청

    rect rgb(230, 245, 230)
        note over O: 1. 주문 생성 (PENDING)
        O->>O: 재고 사전 확인 (gRPC)
        O->>O: OrderCreated 이벤트 저장 (Outbox)
        O-->>C: OrderResponse (PENDING)
    end

    O->>K: ORDER_CREATED 이벤트 발행

    rect rgb(230, 235, 245)
        note over P: 2. 결제 처리
        K->>P: ORDER_CREATED 구독
        P->>P: Stripe 결제 승인
        P->>K: PAYMENT_COMPLETED 발행
    end

    rect rgb(245, 235, 230)
        note over I: 3. 재고 차감
        K->>I: PAYMENT_COMPLETED 구독
        I->>I: 재고 차감 (분산락)
        I->>K: INVENTORY_RESERVED 발행
    end

    rect rgb(240, 240, 230)
        note over O: 4. 주문 확정
        K->>O: INVENTORY_RESERVED 구독
        O->>O: 주문 상태 → CONFIRMED
        O->>K: ORDER_CONFIRMED 발행
    end
```

## 실패 시나리오 — 결제 실패 보상 트랜잭션

```mermaid
sequenceDiagram
    participant O as Order Service
    participant P as Payment Service
    participant K as Kafka

    O->>K: ORDER_CREATED 발행
    K->>P: ORDER_CREATED 구독
    P->>P: Stripe 결제 실패 ❌
    P->>K: PAYMENT_FAILED 발행

    rect rgb(255, 230, 230)
        note over O: 보상 트랜잭션
        K->>O: PAYMENT_FAILED 구독
        O->>O: 주문 상태 → CANCELLED
        O->>K: ORDER_CANCELLED 발행
    end
```

## 실패 시나리오 — 재고 부족 보상 트랜잭션

```mermaid
sequenceDiagram
    participant O as Order Service
    participant P as Payment Service
    participant I as Inventory Service
    participant K as Kafka

    K->>I: PAYMENT_COMPLETED 구독
    I->>I: 재고 확인 → 부족 ❌
    I->>K: INVENTORY_FAILED 발행

    rect rgb(255, 230, 230)
        note over P,O: 보상 트랜잭션
        K->>P: INVENTORY_FAILED 구독
        P->>P: Stripe 환불 처리
        P->>K: PAYMENT_REFUNDED 발행
        K->>O: PAYMENT_REFUNDED 구독
        O->>O: 주문 상태 → CANCELLED
    end
```

## Transactional Outbox — 메시지 유실 방지

```mermaid
sequenceDiagram
    participant S as Service
    participant DB as Database
    participant OP as Outbox Processor
    participant K as Kafka

    S->>DB: 도메인 저장 + OutboxEvent 저장 (단일 트랜잭션)
    Note over DB: 원자적 저장 보장

    loop 500ms 폴링
        OP->>DB: PENDING 이벤트 조회
        OP->>K: Kafka 발행
        OP->>DB: 상태 → PUBLISHED
    end

    Note over OP,K: Kafka 장애 시 DB에 PENDING 유지<br/>복구 후 자동 재발행
```

## DLQ 재처리 흐름

```mermaid
flowchart TD
    A[메시지 수신] --> B{처리 성공?}
    B -- Yes --> C[PUBLISHED 마킹]
    B -- No --> D[재시도 1 - 1초]
    D --> E{성공?}
    E -- Yes --> C
    E -- No --> F[재시도 2 - 2초]
    F --> G{성공?}
    G -- Yes --> C
    G -- No --> H[재시도 3 - 4초]
    H --> I{성공?}
    I -- Yes --> C
    I -- No --> J[DLQ로 이동]
    J --> K[운영팀 알림 - Slack]
    K --> L[수동 검토 및 재처리]
```
