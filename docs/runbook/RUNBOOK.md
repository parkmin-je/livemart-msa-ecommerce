# LiveMart 운영 런북 (On-Call Runbook)

> 장애 감지 → 진단 → 복구 → 사후 분석 표준 절차

---

## 온콜 연락처

| 역할 | 채널 | 응답 시간 |
|------|------|----------|
| Backend On-Call | #incident-backend (Slack) | 15분 이내 |
| Frontend On-Call | #incident-frontend (Slack) | 30분 이내 |
| Platform On-Call | #incident-platform (Slack) | 15분 이내 |

---

## 1. API Gateway 레이턴시 급등

**알림**: `APIGatewayLatencyHigh` (p99 > 2,000ms, 5분 지속)

### 진단 절차

```bash
# 1. Pod 상태 확인
kubectl get pods -n livemart -l app=api-gateway

# 2. 최근 로그 확인
kubectl logs -n livemart -l app=api-gateway --tail=100 | grep -E "ERROR|WARN|timeout"

# 3. Circuit Breaker 상태 확인
kubectl exec -n livemart <api-gateway-pod> -- curl -s localhost:8888/actuator/circuitbreakers | jq

# 4. 업스트림 서비스 상태 확인
kubectl get pods -n livemart | grep -v Running

# 5. HPA 상태 확인 (스케일링 중인지)
kubectl get hpa -n livemart
```

### 복구 절차

| 원인 | 조치 |
|------|------|
| 특정 서비스 Circuit Open | `kubectl rollout restart deployment/<service> -n livemart` |
| Pod OOM | `kubectl describe pod <pod> -n livemart` → 메모리 제한 조정 |
| HPA 최대 도달 | 수동 replicas 증가: `kubectl scale deployment api-gateway --replicas=15 -n livemart` |
| 레디스 연결 불가 | `kubectl exec -n livemart <pod> -- redis-cli -h redis ping` |

---

## 2. 주문 서비스 결제 실패율 급등

**알림**: `PaymentFailureRateHigh` (실패율 > 5%, 3분 지속)

### 진단 절차

```bash
# 1. 결제 서비스 로그 확인
kubectl logs -n livemart -l app=payment-service --tail=200 | grep -E "ERROR|Stripe|timeout"

# 2. Kafka DLQ 메시지 확인
kubectl exec -n livemart <kafka-pod> -- kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic payment-events.DLT \
  --from-beginning \
  --max-messages 10

# 3. DB 연결 상태 확인
kubectl exec -n livemart <payment-pod> -- curl -s localhost:8084/actuator/health | jq '.components.db'

# 4. Stripe API 상태 확인
# → https://status.stripe.com 직접 확인
```

### 복구 절차

| 원인 | 조치 |
|------|------|
| Stripe API 장애 | status.stripe.com 확인 후 대기, 고객 공지 |
| DB 연결 풀 고갈 | 서비스 재시작: `kubectl rollout restart deployment/payment-service -n livemart` |
| DLQ 쌓임 | DLQ 재처리: `kubectl exec` → Kafka consumer 수동 재처리 |
| 인증 토큰 만료 | K8s Secret 갱신 후 서비스 재시작 |

---

## 3. 재고 서비스 분산락 타임아웃

**알림**: `DistributedLockTimeout` (Redisson 락 획득 실패 > 10/min)

### 진단 절차

```bash
# 1. Redis 상태 확인
kubectl exec -n livemart <redis-pod> -- redis-cli INFO server | grep uptime
kubectl exec -n livemart <redis-pod> -- redis-cli INFO clients | grep connected_clients

# 2. 락 보유 키 확인
kubectl exec -n livemart <redis-pod> -- redis-cli KEYS "lock:*"

# 3. 재고 서비스 로그
kubectl logs -n livemart -l app=inventory-service --tail=100 | grep -E "lock|timeout|ERROR"
```

### 복구 절차

| 원인 | 조치 |
|------|------|
| 데드락 (락 미해제) | `kubectl exec <redis-pod> -- redis-cli DEL lock:<key>` |
| Redis 메모리 부족 | `redis-cli INFO memory` 확인 → maxmemory 조정 |
| 트래픽 폭주 (플래시세일) | 주문 서비스 Rate Limit 임시 강화 |

---

## 4. Kafka 컨슈머 랙 급증

**알림**: `KafkaConsumerLagHigh` (lag > 10,000, 10분 지속)

### 진단 절차

```bash
# 1. 컨슈머 그룹 랙 확인
kubectl exec -n livemart <kafka-pod> -- kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group livemart-order-group

# 2. 파티션별 메시지 수 확인
kubectl exec -n livemart <kafka-pod> -- kafka-run-class.sh kafka.tools.GetOffsetShell \
  --broker-list localhost:9092 \
  --topic order-events

# 3. 컨슈머 로그 확인
kubectl logs -n livemart -l app=order-service --tail=200 | grep -E "KafkaConsumer|ERROR"
```

### 복구 절차

| 원인 | 조치 |
|------|------|
| 컨슈머 처리 속도 저하 | 파티션 수 증가 → 컨슈머 replicas 증가 |
| DLQ 메시지 쌓임 | DLQ 컨슈머 별도 실행 |
| 직렬화 오류 | 해당 메시지 스킵 후 DLQ 이동 |

---

## 5. 장애 사후 분석 (Post-Mortem) 템플릿

```markdown
## 장애 보고서 — [날짜] [서비스] [간략한 제목]

### 요약
- **장애 시간**: YYYY-MM-DD HH:MM ~ HH:MM KST (총 N분)
- **영향 범위**: 결제 기능 100% 불가 / 주문 조회 50% 지연 등
- **심각도**: P1 (서비스 전체 불가) / P2 (주요 기능 불가) / P3 (부분 기능 저하)

### 타임라인
- HH:MM — 알림 발생
- HH:MM — 온콜 응답
- HH:MM — 원인 파악
- HH:MM — 복구 조치 시작
- HH:MM — 서비스 정상화 확인

### 근본 원인 (Root Cause)

### 재발 방지 조치
| 항목 | 담당자 | 기한 |
|------|--------|------|
| | | |
```

---

## 6. 유용한 kubectl 명령어 모음

```bash
# 전체 Pod 상태 한눈에
kubectl get pods -n livemart -o wide

# 이벤트 최근 30개
kubectl get events -n livemart --sort-by='.lastTimestamp' | tail -30

# 리소스 사용량
kubectl top pods -n livemart

# 롤링 재시작
kubectl rollout restart deployment/<service> -n livemart

# 롤백
kubectl rollout undo deployment/<service> -n livemart

# 특정 Pod 셸 접속
kubectl exec -it <pod-name> -n livemart -- /bin/sh
```
