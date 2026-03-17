# LiveMart On-Call Runbook

> 이 런북은 프로덕션 장애 대응 시 참고합니다.
> 긴급 연락: Slack `#livemart-alerts` 채널

---

## 목차

1. [모니터링 대시보드 접속](#1-모니터링-대시보드-접속)
2. [알림 레벨 정의](#2-알림-레벨-정의)
3. [서비스별 장애 대응](#3-서비스별-장애-대응)
4. [Kafka 장애 대응](#4-kafka-장애-대응)
5. [데이터베이스 장애 대응](#5-데이터베이스-장애-대응)
6. [롤백 절차](#6-롤백-절차)
7. [에스컬레이션 기준](#7-에스컬레이션-기준)

---

## 1. 모니터링 대시보드 접속

| 시스템 | URL | 용도 |
|--------|-----|------|
| Grafana | `http://grafana.livemart.svc:3000` (K8s 내부) | 메트릭 대시보드 |
| Kibana | `http://kibana.livemart.svc:5601` | 로그 검색 |
| Zipkin | `http://zipkin.livemart.svc:9411` | 분산 추적 |
| Prometheus | `http://prometheus.livemart.svc:9090` | 원시 메트릭 쿼리 |

```bash
# 로컬 포트포워딩 (kubectl)
kubectl port-forward -n livemart svc/grafana 13000:3000
kubectl port-forward -n livemart svc/kibana 15601:5601
kubectl port-forward -n livemart svc/zipkin 19411:9411
```

---

## 2. 알림 레벨 정의

| 레벨 | 조건 | 대응 시간 |
|------|------|---------|
| **P1 Critical** | 결제 불가 / 전체 서비스 다운 / 데이터 유실 | 15분 이내 |
| **P2 High** | 주문 생성 실패율 > 5% / p99 레이턴시 SLO 2배 초과 | 30분 이내 |
| **P3 Medium** | 비핵심 서비스 장애 / 캐시 미스율 급등 | 2시간 이내 |
| **P4 Low** | 경고성 알림 / 용량 임박 | 다음 영업일 |

---

## 3. 서비스별 장애 대응

### 3.1 order-service 응답 없음

```bash
# Pod 상태 확인
kubectl get pods -n livemart -l app=order-service

# 로그 확인 (최근 100줄)
kubectl logs -n livemart -l app=order-service --tail=100

# Pod 재시작
kubectl rollout restart deployment/order-service -n livemart

# 재시작 완료 대기
kubectl rollout status deployment/order-service -n livemart
```

**체크리스트:**
- [ ] DB 연결 상태 확인 (`SPRING_DATASOURCE_URL` 환경변수)
- [ ] Kafka 연결 상태 확인
- [ ] Eureka 등록 여부 확인
- [ ] HPA 스케일아웃 확인 (`kubectl get hpa -n livemart`)

### 3.2 payment-service Circuit Breaker 발동

Grafana → "LiveMart Services" 대시보드 → Circuit Breaker State 패널 확인

```bash
# Istio 메트릭으로 Circuit Breaker 상태 확인
kubectl exec -n livemart deploy/api-gateway -- \
  curl -s http://localhost:15020/stats | grep payment-service | grep overflow

# payment-service 헬스 체크
kubectl exec -n livemart deploy/order-service -- \
  curl -s http://payment-service:8084/actuator/health
```

**원인별 대응:**
- DB 연결 고갈 → `HikariCP` pool size 확인, DB 연결 수 확인
- Stripe API 타임아웃 → Stripe 상태 페이지 확인 (https://status.stripe.com)
- OOM → `kubectl describe pod` 메모리 사용량 확인 → JVM heap 조정

### 3.3 api-gateway Rate Limiting 오작동

```bash
# Redis 연결 상태
kubectl exec -n livemart deploy/api-gateway -- \
  curl -s http://localhost:8080/actuator/health/redis

# Token Bucket 키 직접 확인
kubectl exec -n livemart deploy/redis-0 -- \
  redis-cli KEYS "rate_limit:*" | head -20
```

### 3.4 Elasticsearch 검색 불가

```bash
# ES 클러스터 상태
kubectl exec -n livemart deploy/product-service -- \
  curl -s http://elasticsearch:9200/_cluster/health?pretty

# 인덱스 상태
kubectl exec -n livemart deploy/product-service -- \
  curl -s http://elasticsearch:9200/_cat/indices?v
```

---

## 4. Kafka 장애 대응

### Consumer Lag 급증

```bash
# Consumer Group Lag 확인
kubectl exec -n livemart deploy/kafka-0 -- \
  kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group order-service-group

# 주요 토픽 목록
# order-events, payment-events, stock-events, order-events.DLT, payment-events.DLT
```

### Dead Letter Topic (DLT) 메시지 확인

```bash
# DLT 메시지 확인 (최근 10개)
kubectl exec -n livemart deploy/kafka-0 -- \
  kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic order-events.DLT \
  --from-beginning --max-messages 10

# DLT 메시지 재처리 (수동 replay)
# 1. DLT 메시지 추출 및 원본 토픽으로 재발행
# 2. order-service Admin API 활용: POST /admin/replay-dlq
```

### Outbox Processor 중단

```bash
# Outbox 이벤트 적체 확인 (DB 직접 조회)
kubectl exec -n livemart deploy/postgres-order-0 -- \
  psql -U livemart -d orderdb -c \
  "SELECT status, COUNT(*) FROM outbox_events GROUP BY status;"

# PENDING 상태가 계속 증가하면 → OutboxProcessor 스레드 확인
kubectl logs -n livemart -l app=order-service | grep "OutboxProcessor"
```

---

## 5. 데이터베이스 장애 대응

### Connection Pool 고갈

```bash
# HikariCP 메트릭 (Prometheus 쿼리)
# hikaricp_connections_active{pool="HikariPool-1"}
# hikaricp_connections_pending{pool="HikariPool-1"}

# 현재 활성 연결 수 확인 (PostgreSQL)
kubectl exec -n livemart deploy/postgres-order-0 -- \
  psql -U livemart -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

**임시 조치:** application.yml `maximumPoolSize` 조정 후 Pod 재시작

### Flyway 마이그레이션 실패

서비스 기동 시 Flyway 오류로 시작 실패하는 경우:

```bash
# 마이그레이션 이력 확인
kubectl exec -n livemart deploy/postgres-order-0 -- \
  psql -U livemart -d orderdb -c \
  "SELECT * FROM flyway_schema_history ORDER BY installed_on DESC LIMIT 5;"

# 실패한 마이그레이션 수동 복구 후 checksum 수정 필요 시
# → DBA 에스컬레이션 (데이터 무결성 확인 필수)
```

---

## 6. 롤백 절차

### 긴급 롤백 (서비스 단위)

```bash
# 직전 버전으로 롤백
kubectl rollout undo deployment/order-service -n livemart

# 특정 버전으로 롤백
kubectl rollout undo deployment/order-service -n livemart --to-revision=3

# 롤백 히스토리 확인
kubectl rollout history deployment/order-service -n livemart
```

### Helm 릴리즈 롤백

```bash
# 릴리즈 히스토리 확인
helm history livemart -n livemart

# 이전 버전으로 롤백
helm rollback livemart 1 -n livemart
```

---

## 7. 에스컬레이션 기준

| 상황 | 조치 |
|------|------|
| 결제 서비스 10분 이상 다운 | 즉시 PO + CTO 호출 |
| 데이터 유실/정합성 오류 의심 | DBA + 개발 리드 호출, 쓰기 트래픽 차단 검토 |
| 보안 침해 의심 | SECURITY.md 절차 따라 즉시 보안팀 호출 |
| SLO 60분 이상 위반 | 서비스 상태 페이지 업데이트 + 고객 공지 |

---

*최종 업데이트: 2026-03-17 | 담당: @parkmin-je*
