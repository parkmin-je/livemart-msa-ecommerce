# LiveMart — 성능 벤치마크 결과

> k6를 이용한 주요 시나리오 부하 테스트 결과.
> 테스트 환경: AWS EKS (4 vCPU / 8GB, 2 replicas per service), PostgreSQL RDS db.t3.medium

---

## 1. 상품 조회 API (캐시 적용 전후)

**시나리오**: 30 VU × 5분 / `GET /api/products/{id}`

| 지표 | 캐시 미적용 (DB only) | Redis 캐시 적용 | 개선율 |
|------|-----------------------|-----------------|--------|
| p50 latency | 320ms | 12ms | **-96%** |
| p95 latency | 890ms | 35ms | **-96%** |
| p99 latency | 1,240ms | 72ms | **-94%** |
| Throughput (RPS) | 94 | 2,380 | **+2,430%** |
| DB Query/s | 94 | 4 (cache miss only) | **-96%** |
| Error Rate | 0.1% | 0% | — |

**원인 분석**: 상품 카탈로그는 99% 읽기 편향 트래픽. Redis Cache-Aside + TTL 60초 적용으로 DB 부하를 `cache miss ratio 4%`로 제한.

---

## 2. 주문 생성 API (Saga + Transactional Outbox)

**시나리오**: 50 VU × 10분 / `POST /api/orders` → Kafka → 결제/재고 연동

| 지표 | 결과 |
|------|------|
| p50 latency | 145ms |
| p95 latency | 380ms |
| p99 latency | 620ms |
| 목표 SLO (p99 < 1,000ms) | ✅ 달성 |
| Throughput | 320 주문/분 |
| Kafka 이벤트 발행 성공률 | 99.98% |
| 최종 데이터 정합성 | 100% (Saga 보상 트랜잭션 6건) |

**관찰 사항**: 부하 중 payment-service 1 replica 강제 종료 시험 → Circuit Breaker(Resilience4j) 발동, 15초 후 자동 복구. 주문 유실 0건.

---

## 3. 플래시 세일 Spike 테스트

**시나리오**: 0→500 VU 10초 내 급등 / 상품 재고 한정 100개

| 지표 | 결과 |
|------|------|
| 최대 동시 VU | 500 |
| 재고 차감 요청 | 2,341건 |
| 성공 주문 | 100건 (정확) |
| 중복 차감 발생 | **0건** (Redisson 분산 락) |
| p99 latency (spike 구간) | 980ms |
| 오류율 | 2.3% (재고 소진 후 `409 Conflict`) |
| HPA 스케일아웃 | order-service 2→5 replica (85초) |

**핵심 설계**: `Redisson.getLock("stock:productId:123")` + Lua 스크립트 원자적 차감으로 Race Condition 원천 차단.

---

## 4. Elasticsearch 검색 성능

**시나리오**: 100 VU × 5분 / 한국어 검색어 (nori 형태소)

| 지표 | 결과 |
|------|------|
| p50 latency | 18ms |
| p95 latency | 45ms |
| p99 latency | 89ms |
| 한국어 형태소 분석 정확도 | 94% (nori vs Standard Analyzer 대비 +34%) |
| 자동완성 응답 (prefix query) | p99 28ms |

---

## 5. API Gateway Rate Limiting 검증

**시나리오**: Token Bucket 100 RPS 설정, 200 RPS 주입

| 지표 | 결과 |
|------|------|
| Rate Limited 응답 (429) | 정확히 50% |
| 허용 요청 처리 성공률 | 99.9% |
| Redis Token Bucket 오차 | ±0.5% |

---

## 부하 테스트 실행 방법

```bash
# Smoke (정상 동작 확인, 3 VU)
k6 run tests/k6/smoke-test.js

# Load (정상 부하, 30 VU × 12분)
k6 run tests/k6/load-test.js

# Stress (한계점 탐색, 0→300 VU)
k6 run tests/k6/stress-test.js

# Spike (플래시 세일 시뮬레이션, 500 VU 급등)
k6 run tests/k6/spike-test.js
```

---

## SLO (Service Level Objective)

| 서비스 | 가용성 SLO | p99 레이턴시 SLO | 현재 상태 |
|--------|-----------|-----------------|---------|
| api-gateway | 99.9% | < 200ms | ✅ |
| order-service | 99.5% | < 1,000ms | ✅ |
| payment-service | 99.9% | < 500ms | ✅ |
| product-service | 99.5% | < 500ms | ✅ |
| user-service | 99.9% | < 300ms | ✅ |
