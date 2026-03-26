# K8s에서 SSE가 갑자기 안 되더라 — Redis Pub/Sub으로 해결한 과정

"알림이 가끔 안 와요."

처음엔 그냥 넘겼다. 브라우저 새로고침하면 되니까. 근데 팀원이 K8s에서 HPA로 스케일아웃 테스트를 하는 날, 로그를 보다가 원인을 딱 발견했다.

## SSE를 처음 만들 때는 쉬웠다

notification-service를 처음 만들 때는 간단했다. Spring WebFlux를 써서 `Sinks.Many`로 SSE 스트림을 만들고, 알림이 생성될 때 해당 sink에 이벤트를 push하는 방식이었다.

로컬에서는 완벽하게 동작했다. 주문 완료 이벤트가 Kafka에 발행되면 `OrderEventConsumer`가 받아서 `NotificationService.createNotification()`을 호출하고, 브라우저에 즉시 알림이 뜬다. 데모도 잘 됐다.

```java
// 처음 버전 (단순하지만 문제가 있었다)
public Flux<NotificationResponse> streamNotifications(Long userId) {
    Sinks.Many<Notification> sink = userSinks.computeIfAbsent(userId,
            k -> Sinks.many().multicast().onBackpressureBuffer());

    return sink.asFlux()
            .map(NotificationResponse::from);
}

public void pushNotification(Long userId, Notification notification) {
    Sinks.Many<Notification> sink = userSinks.get(userId);
    if (sink != null) {
        sink.tryEmitNext(notification);  // 로컬 메모리의 sink에만 push
    }
}
```

문제는 `userSinks`가 `ConcurrentHashMap`으로 **각 인스턴스 메모리에만 존재**한다는 것이다. 이게 화근이었다.

## 스케일아웃 후 "알림이 30%만 와요"

K8s HPA 설정으로 notification-service가 3개 파드로 늘어났다. 그 이후부터 알림이 가끔 안 온다는 제보가 들어왔다.

로그를 뜯어보니 패턴이 보였다. 사용자의 SSE 연결은 파드 A에 맺혀 있는데, Kafka consumer는 파드 B에서 돌고 있었다. 파드 B가 알림을 생성하면 파드 B의 `userSinks`에서 해당 userId를 찾는다. 없다. 파드 A에 연결돼 있으니까. 결국 알림은 그냥 버려진다.

```
[파드 A] userId=42의 SSE 연결이 있다
[파드 B] Kafka에서 userId=42 알림 이벤트 수신 → userSinks.get(42) → null → 알림 유실
```

K8s의 기본 로드밸런싱은 라운드로빈이다. SSE 연결 요청이 파드 A에 붙었다고 해서 이후 Kafka 처리도 파드 A에서 일어나리라는 보장이 없다. 3개 파드면 알림을 받을 확률이 단순 계산으로 33%다. 실제로 대략 그 정도 비율로 누락되고 있었다.

이걸 해결하는 방법은 몇 가지가 있었다.

**옵션 1: Sticky Session (IP 해시 기반 로드밸런싱)**
같은 사용자의 요청이 항상 같은 파드로 가도록 한다. 구현이 단순하지만 파드가 죽으면 연결이 끊기고, 트래픽 분산이 불균형해질 수 있다.

**옵션 2: Redis Pub/Sub으로 크로스 인스턴스 브로드캐스트**
알림 생성 시 Redis 채널에 publish하고, 모든 파드가 subscribe하고 있다가 자신의 메모리에 해당 userId의 sink가 있으면 push한다. 파드가 몇 개든 상관없다.

Sticky Session은 K8s에서 설정이 간단하지 않고, 파드 재시작 시 연결이 끊기는 문제가 있어서 Redis Pub/Sub을 선택했다.

## 아이디어: "모든 파드가 모든 알림을 받으면 되지 않나?"

핵심 아이디어는 이렇다. 알림을 생성할 때 특정 파드에만 보내는 게 아니라 Redis 채널에 publish한다. 모든 파드가 그 채널을 subscribe하고 있다가, 자신의 `userSinks`에 해당 userId가 있으면 push한다. 없으면 그냥 무시한다.

```
[파드 B] 알림 생성 → Redis PUBLISH "notification:events" {userId:42, message:...}
[파드 A] Redis SUBSCRIBE → userId=42의 sink 존재 → tryEmitNext() → 브라우저에 전달
[파드 B] Redis SUBSCRIBE → userId=42의 sink 없음 → 무시
[파드 C] Redis SUBSCRIBE → userId=42의 sink 없음 → 무시
```

이렇게 하면 몇 개의 파드가 떠 있든 SSE 연결을 가진 파드가 알림을 받는다.

## 실제 구현

WebFlux + Reactor 기반으로 구현했다. 일단 Redis 템플릿을 두 가지로 나눠서 설정했다. 하나는 `Notification` 객체 직렬화용, 하나는 Pub/Sub 채널용 String 템플릿이다.

```java
// RedisReactiveConfig.java
@Bean
public ReactiveRedisTemplate<String, Notification> reactiveRedisTemplate(
        ReactiveRedisConnectionFactory connectionFactory,
        ObjectMapper objectMapper) {

    Jackson2JsonRedisSerializer<Notification> serializer =
            new Jackson2JsonRedisSerializer<>(objectMapper, Notification.class);

    RedisSerializationContext<String, Notification> context =
            RedisSerializationContext.<String, Notification>newSerializationContext(new StringRedisSerializer())
                    .value(serializer)
                    .build();

    return new ReactiveRedisTemplate<>(connectionFactory, context);
}

@Bean
public ReactiveRedisTemplate<String, String> stringReactiveRedisTemplate(
        ReactiveRedisConnectionFactory connectionFactory) {
    // Pub/Sub 채널용 — JSON 문자열로 주고받는다
    return new ReactiveRedisTemplate<>(connectionFactory, RedisSerializationContext.string());
}
```

`NotificationService`에서 애플리케이션 시작 시 Redis 채널을 구독한다.

```java
static final String NOTIFICATION_CHANNEL = "notification:events";

@PostConstruct
public void startRedisSubscription() {
    stringReactiveRedisTemplate
            .listenToChannel(NOTIFICATION_CHANNEL)
            .map(message -> message.getMessage())
            .flatMap(this::deserializeNotification)
            .subscribe(
                notification -> pushToLocalSink(notification),
                error -> log.error("Redis 알림 구독 오류: {}", error.getMessage())
            );
    log.info("Redis 알림 채널 구독 시작: {}", NOTIFICATION_CHANNEL);
}
```

알림 생성 시에는 Redis LIST에 저장 후 Pub/Sub 채널에 publish한다.

```java
public Mono<NotificationResponse> createNotification(Long userId, Notification.NotificationType type,
                                                      String title, String message, String referenceId) {
    Notification notification = Notification.builder()
            .id(UUID.randomUUID().toString())
            .userId(userId)
            .type(type)
            .title(title)
            .message(message)
            .referenceId(referenceId)
            .read(false)
            .createdAt(LocalDateTime.now())
            .build();

    String listKey = NOTIFICATION_KEY_PREFIX + userId;

    return reactiveRedisTemplate.opsForList()
            .leftPush(listKey, notification)
            .then(reactiveRedisTemplate.expire(listKey, Duration.ofDays(30)))
            .then(serializeAndPublish(notification))  // Redis Pub/Sub 발행
            .thenReturn(NotificationResponse.from(notification));
}

private Mono<Void> serializeAndPublish(Notification notification) {
    try {
        String json = objectMapper.writeValueAsString(notification);
        return stringReactiveRedisTemplate.convertAndSend(NOTIFICATION_CHANNEL, json).then();
    } catch (JsonProcessingException e) {
        log.error("알림 직렬화 실패: {}", e.getMessage());
        return Mono.empty();
    }
}
```

채널에서 메시지를 수신하면 로컬 sink에 push한다.

```java
private void pushToLocalSink(Notification notification) {
    Sinks.Many<Notification> sink = userSinks.get(notification.getUserId());
    if (sink != null) {
        sink.tryEmitNext(notification);
    }
    // 없으면 무시 — 이 파드에 해당 사용자의 SSE 연결이 없는 것
}
```

SSE 엔드포인트는 WebFlux 컨트롤러에서 이렇게 처리한다. 연결 즉시 `connected` 이벤트를 보내서 HTTP 헤더가 바로 flush되도록 했다. 이게 없으면 첫 알림이 올 때까지 브라우저가 연결됐는지 모른다.

```java
@GetMapping(value = "/stream/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<NotificationResponse>> streamNotifications(@PathVariable Long userId) {
    // 즉시 연결 확인 이벤트 전송
    ServerSentEvent<NotificationResponse> connected = ServerSentEvent
            .<NotificationResponse>builder().comment("connected").build();

    // 30초마다 heartbeat — 프록시/게이트웨이 연결 유지
    Flux<ServerSentEvent<NotificationResponse>> heartbeats = Flux
            .interval(Duration.ofSeconds(30))
            .map(i -> ServerSentEvent.<NotificationResponse>builder().comment("heartbeat").build());

    Flux<ServerSentEvent<NotificationResponse>> notifications = notificationService
            .streamNotifications(userId)
            .map(notification -> ServerSentEvent.<NotificationResponse>builder()
                    .id(notification.getId())
                    .event("notification")
                    .data(notification)
                    .build());

    return Flux.concat(
            Flux.just(connected),
            Flux.merge(notifications, heartbeats)
    );
}
```

heartbeat도 중요하다. K8s 앞에 ingress, API gateway, 로드밸런서 같은 프록시가 여럿 있다. 이들은 유휴 연결을 보통 60~90초 후에 끊어버린다. 30초마다 빈 이벤트를 보내면 "이 연결 아직 살아있어"를 알려줄 수 있다.

## 테스트 방법

로컬에서 테스트할 때는 Docker Compose로 notification-service를 3개 띄웠다.

```bash
# 파드 1: 8085, 파드 2: 8086, 파드 3: 8087
docker-compose up --scale notification-service=3
```

그리고 파드 1에 SSE 연결을 맺고, 파드 2로 알림 생성 요청을 보냈다.

```bash
# 터미널 1: 파드 1에 SSE 연결
curl -N http://localhost:8085/api/notifications/stream/42

# 터미널 2: 파드 2로 알림 생성 (직접 내부 API 호출)
curl -X POST http://localhost:8086/api/notifications/internal \
  -d '{"userId": 42, "type": "ORDER_CONFIRMED", "title": "주문 확인", "message": "주문이 확인되었습니다"}'
```

Redis Pub/Sub 이전에는 터미널 1에서 아무것도 안 왔다. 이후에는 바로 알림이 전달됐다.

실제 K8s 환경에서는 `kubectl scale deployment notification-service --replicas=3`으로 확인했고, 어느 파드에 SSE가 붙어 있든 알림이 정상 전달되는 걸 확인했다.

## 구현하면서 헤맸던 부분들

**WebFlux 위에서 블로킹 코드를 쓰면 안 된다.** 처음에 `@PostConstruct`에서 블로킹 방식으로 Redis subscribe를 하려다가 Netty 이벤트 루프 스레드가 막혀서 서비스 전체가 응답을 못 하는 상황이 생겼다. `listenToChannel()`이 리액티브 스트림을 반환하니까 `.subscribe()`로 비동기로 처리해야 한다.

**sink에 이미 취소된 구독자가 남아 있다.** 사용자가 브라우저를 닫으면 SSE 연결이 끊기면서 sink가 취소(cancel)된다. 그런데 `userSinks` map에서 제거하지 않으면 다음에 같은 userId로 알림이 오면 `tryEmitNext()`가 실패한다. `doOnCancel()`에서 명시적으로 제거해야 한다.

```java
return sink.asFlux()
        .map(NotificationResponse::from)
        .doOnCancel(() -> {
            userSinks.remove(userId);
            log.info("SSE 구독 종료: userId={}", userId);
        });
```

**Redis Pub/Sub은 메시지를 저장하지 않는다.** SSE 연결이 끊겨 있는 동안 발생한 알림은 Pub/Sub 채널로는 받을 수 없다. 그래서 Redis LIST(`notifications:user:{userId}`)에도 알림을 저장했다. 사용자가 재접속하면 `getUserNotifications()`로 기존 알림을 조회할 수 있다. Pub/Sub은 실시간 push용, LIST는 히스토리 보관용으로 역할을 분리했다.

## 결론

단일 서버에서 잘 됐던 SSE가 스케일아웃 후 갑자기 30%만 동작하는 건 꽤 당황스러운 경험이었다. 코드 자체에는 버그가 없었다. 분산 환경에서 로컬 상태(in-memory)를 갖는 게 문제였다.

Redis Pub/Sub으로 해결한 구조는 단순하다. 어느 인스턴스에서 이벤트가 발생하든 Redis 채널을 통해 모든 인스턴스에 전파된다. 각 인스턴스는 자신의 로컬 sink에 연결된 사용자에게만 push한다. Redis라는 공유 브로커가 인스턴스 간 브리지 역할을 한다.

MSA에서 상태를 어디에 두느냐는 생각보다 훨씬 중요한 문제다. 인스턴스가 하나일 때는 로컬 상태가 편리하지만, 스케일아웃하는 순간 무너진다. 공유 상태는 Redis, DB 같은 외부 저장소에 두고, 각 인스턴스는 가능한 한 stateless하게 가져가는 게 맞다. 이걸 처음부터 알았다면 좋았겠지만, 직접 당해봐야 확실히 기억에 남는다.
