# MSA 첫 도전기 — Saga + Transactional Outbox로 주문-결제-재고를 어떻게 묶었나

처음 MSA를 설계할 때 제일 막막했던 게 "주문이 생성되면 결제도 되고 재고도 줄어야 하는데, 이걸 어떻게 묶지?"였다. 모놀리식에서는 그냥 `@Transactional` 하나면 됐는데, 서비스가 셋으로 쪼개지니까 갑자기 머릿속이 하얘졌다.

## 2PC부터 시작했다가 바로 포기한 이야기

처음에는 2PC(Two-Phase Commit)를 찾아봤다. 이론적으로는 깔끔했다. 코디네이터가 "다들 준비됐어?" 물어보고 모두 "OK" 하면 "그럼 커밋해" 하는 방식. 근데 실제로 구현 방법을 찾다 보니 문제가 한두 가지가 아니었다.

일단 코디네이터가 죽으면 참여한 서비스들이 전부 잠금 상태로 멈춰버린다. order-service, payment-service, product-service 셋 다 블로킹. 네트워크 파티션이 생기면 더 심각하다. 그리고 MSA의 장점인 독립 배포가 사실상 불가능해진다. 각 서비스가 코디네이터에 강하게 결합되니까.

"이건 아니다" 싶어서 다른 방법을 찾았다.

## Saga 패턴을 알게 됐을 때

Saga는 긴 트랜잭션을 여러 개의 로컬 트랜잭션으로 쪼개고, 실패하면 보상 트랜잭션(compensating transaction)으로 되돌리는 방식이다. 구현 방식은 크게 두 가지다.

**Orchestration**: 중앙 오케스트레이터가 각 서비스한테 "너 이거 해", "너 저거 해" 명령을 내린다. 흐름이 한 곳에 집중되어 있어서 파악하기는 쉬운데, 결국 코디네이터라는 단일 장애점이 생긴다. 그리고 오케스트레이터가 각 서비스를 직접 알아야 하니까 결합도가 높아진다.

**Choreography**: 각 서비스가 이벤트를 발행하고, 다른 서비스가 그 이벤트를 구독해서 알아서 처리한다. 오케스트레이터가 없다. 서비스끼리 이벤트로만 통신하니까 느슨하게 결합된다.

우리 시스템에서는 Choreography를 선택했다. 서비스가 지금은 셋이지만 나중에 더 늘어날 수 있고, 각 서비스가 독립적으로 배포될 수 있어야 했으니까.

흐름은 이렇다:

```
OrderService       PaymentService      ProductService
     │                    │                   │
  주문생성                 │                   │
     │──ORDER_CREATED──►  │                   │
     │                 결제처리               │
     │                    │──PAYMENT_COMPLETED►│
     │                    │               재고차감
     │◄──ORDER_CONFIRMED──│                   │
```

실패 시에는:

```
결제 실패 → PAYMENT_FAILED → order-service: 주문 취소
재고 부족 → STOCK_FAILED  → payment-service: 환불 처리
```

실제 코드를 보면, `OrderPaymentConsumer`가 payment-events 토픽을 구독하면서 결제 결과에 따라 주문 상태를 바꾼다.

```java
@KafkaListener(
    topics = "payment-events",
    groupId = "order-service-payment-group",
    containerFactory = "paymentKafkaListenerContainerFactory"
)
public void handlePaymentEvent(
        @Payload Map<String, Object> event,
        @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {

    String eventType   = String.valueOf(event.get("eventType"));
    String orderNumber = String.valueOf(event.get("orderNumber"));
    String transactionId = String.valueOf(event.get("transactionId"));

    switch (eventType) {
        case "PAYMENT_COMPLETED" -> handlePaymentCompleted(orderNumber, transactionId);
        case "PAYMENT_FAILED"    -> handlePaymentFailed(orderNumber, transactionId);
        case "PAYMENT_CANCELLED" -> log.info("결제 취소 이벤트 수신: order={}", orderNumber);
        default                  -> log.debug("처리하지 않는 결제 이벤트: {}", eventType);
    }
}
```

반대로 `PaymentEventConsumer`는 order-events를 구독하면서 주문이 취소되면 환불을 자동 처리한다. 환불 실패 시에는 지수 백오프로 최대 3회까지 재시도한다.

```java
private boolean refundWithRetry(String orderNumber, String transactionId) {
    for (int attempt = 1; attempt <= MAX_REFUND_RETRIES; attempt++) {
        try {
            PaymentRequest.Refund refundReq = new PaymentRequest.Refund();
            refundReq.setTransactionId(transactionId);
            paymentService.refundPayment(refundReq);
            log.info("자동 환불 성공: order={}, txn={}, attempt={}", orderNumber, transactionId, attempt);
            return true;
        } catch (Exception e) {
            if (attempt < MAX_REFUND_RETRIES) {
                Thread.sleep((long) Math.pow(2, attempt - 1) * 500L); // 500ms, 1s, 2s
            }
        }
    }
    return false;
}
```

## 이벤트가 유실되는 문제를 맞닥뜨리다

Saga 자체는 잘 동작하는 것처럼 보였는데, 로컬에서 테스트하다가 이상한 걸 발견했다. Kafka를 재시작하는 순간 주문은 DB에 저장됐는데 결제가 안 되는 케이스가 생기는 거다.

원인은 간단했다. OrderService에서 주문을 DB에 저장하고 Kafka에 이벤트를 보내는 두 연산이 원자적이지 않았던 것이다.

```java
// 이게 문제였다
orderRepository.save(order);                              // ① DB 저장 성공
kafkaTemplate.send("order-events", order.getOrderNumber(), event); // ② Kafka 실패 → 이벤트 유실
```

DB 저장은 성공했는데 Kafka 전송이 실패하면 payment-service는 `ORDER_CREATED` 이벤트를 받지 못한다. 주문은 PENDING 상태로 영원히 남는다.

처음에는 "그냥 try-catch로 감싸면 되지 않나?" 싶었는데, Kafka 전송이 실패했다고 해서 DB에 이미 저장된 주문을 롤백하기가 쉽지 않다. 이미 그 트랜잭션이 커밋됐으니까.

## Transactional Outbox 패턴으로 해결하다

해결책은 생각보다 단순했다. 이벤트를 Kafka에 바로 보내는 게 아니라 DB에 먼저 저장하고, 별도 프로세스가 DB를 폴링해서 Kafka로 보내는 방식이다.

핵심은 "주문 저장"과 "이벤트 저장"을 같은 DB 트랜잭션 안에서 처리한다는 것이다.

```java
// OutboxPublisher.java
@Transactional
public void publish(String topic, DomainEvent event) {
    OutboxEvent outboxEvent = OutboxEvent.builder()
            .aggregateType(event.getAggregateType())
            .aggregateId(event.getAggregateId())
            .eventType(event.getEventType())
            .payload(objectMapper.writeValueAsString(event))
            .topic(topic)
            .build();
    outboxRepository.save(outboxEvent);  // 주문 저장과 같은 트랜잭션
}
```

`OutboxEvent` 엔티티는 `outbox_events` 테이블과 매핑된다. 상태(PENDING, COMPLETED, FAILED)와 재시도 횟수를 관리한다.

```java
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String aggregateType;
    private String aggregateId;
    private String eventType;

    @Column(columnDefinition = "TEXT")
    private String payload;

    private String topic;

    @Enumerated(EnumType.STRING)
    private OutboxStatus status = OutboxStatus.PENDING;

    private int retryCount = 0;
    // ...
}
```

그리고 `OutboxProcessor`가 1초 간격으로 PENDING 상태인 이벤트를 폴링해서 Kafka로 전송한다. 중요한 건 `send().get(5, TimeUnit.SECONDS)`로 **동기적으로** 전송 확인을 한다는 점이다. 이걸 비동기로 했다가 한 번 더 당했다.

```java
@Scheduled(fixedDelay = 1000)
@Transactional
public void processOutbox() {
    List<OutboxEvent> events = outboxRepository.findPendingEvents();
    for (OutboxEvent event : events) {
        try {
            // 동기 전송 + 타임아웃: Kafka가 수신 확인할 때까지 대기
            kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload())
                    .get(KAFKA_SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);

            outboxRepository.markAsCompleted(event.getId(), Instant.now());
        } catch (Exception e) {
            outboxRepository.markAsFailed(event.getId());
            // retryCount가 5에 도달하면 findPendingEvents()에서 제외됨
            if (event.getRetryCount() >= 4) {
                log.error("[OUTBOX-ALERT] Event permanently failed after max retries: id={}", event.getId());
            }
        }
    }
}
```

초기 버전에서는 `kafkaTemplate.send()`를 호출하고 비동기 콜백(`whenComplete`)에서 상태를 업데이트하려 했다. 근데 콜백이 실행되기 전에 `@Transactional`이 커밋돼버려서 이벤트가 PENDING인 채로 여러 번 발행되는 문제가 생겼다. `.get(5, TimeUnit.SECONDS)`로 동기 대기하도록 바꾸고 나서야 정상적으로 동작했다.

`OrderService`에서는 이렇게 Outbox를 통해 이벤트를 발행한다.

```java
// Transactional Outbox 패턴으로 이벤트 발행
if (eventPublisher != null) {
    try {
        String payload = objectMapper.writeValueAsString(event);
        DomainEvent domainEvent = DomainEvent.builder()
                .aggregateType("Order")
                .aggregateId(order.getOrderNumber())
                .eventType(eventType.name())
                .payload(payload)
                .build();
        eventPublisher.publish(ORDER_TOPIC, domainEvent);
    } catch (Exception e) {
        log.warn("Outbox publish failed, falling back to direct Kafka: {}", e.getMessage());
        kafkaTemplate.send(ORDER_TOPIC, order.getOrderNumber(), event);
    }
}
```

Outbox 저장이 실패하면 직접 Kafka로 폴백하는 방어 코드도 넣어뒀다. 완벽하진 않지만 운영 초기에는 이게 더 안전하다고 판단했다.

## 삽질하면서 배운 것들

**At-Least-Once vs Exactly-Once**: Outbox 패턴은 At-Least-Once 전달을 보장한다. 즉 같은 이벤트가 두 번 발행될 수 있다. 그래서 consumer 쪽에서 멱등성(idempotency)을 보장해야 한다. `event_id`나 `transactionId` 기반으로 중복 처리를 방지하는 로직이 필요했다.

**1초 폴링의 부하**: outbox_events 테이블을 1초마다 조회하니까 DB 부하가 걱정됐다. `status`와 `createdAt`에 복합 인덱스를 걸고, `retryCount < 5`인 것만 조회하도록 해서 어느 정도 해결했다.

**최종 일관성 수용**: Saga는 즉각적인 일관성이 아니라 최종 일관성을 제공한다. 주문이 생성되고 결제 완료까지 최대 2~3초의 딜레이가 생길 수 있다. UI에서 "결제 처리 중..." 상태를 보여주는 UX를 추가해야 했다. 이게 개발보다 오래 걸렸다.

**디버깅이 어렵다**: 이벤트 흐름이 여러 서비스에 걸쳐 있다 보니 어떤 이벤트가 언제 어디서 처리됐는지 추적이 어려웠다. 나중에 OpenTelemetry로 분산 추적을 붙이고 나서야 디버깅이 수월해졌다.

## 결론

2PC에서 시작해서 Saga Choreography + Transactional Outbox까지 오는 길이 꽤 험했다. 근데 지금 돌아보면 이 구조가 맞다는 확신이 있다. 각 서비스가 이벤트 하나만 알면 되고, Kafka가 잠깐 죽어도 주문이 유실되지 않는다.

완벽한 해결책은 없다. Outbox도 DB 폴링이라는 트레이드오프가 있고, Saga도 보상 트랜잭션 로직이 복잡해지는 단점이 있다. 하지만 모놀리식의 `@Transactional` 하나가 주는 편안함을 포기하고 분산 환경의 복잡함을 받아들인 대신, 각 서비스가 독립적으로 살아남을 수 있는 시스템을 얻었다.
