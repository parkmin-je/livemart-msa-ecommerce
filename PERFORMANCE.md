# LiveMart — 부하 테스트

k6 테스트 스크립트를 작성해 두었습니다.

## 테스트 스크립트 위치

```
tests/load/
└── k6-order-flow.js    # 주문 생성 플로우 (Ramp-up → Steady → Spike)
```

## 실행 방법

```bash
# k6 설치 후
k6 run tests/load/k6-order-flow.js
```

## 측정 대상

- 상품 조회 API (Redis 캐시 적용 전/후 비교)
- 주문 생성 API (Saga + Outbox 포함 end-to-end 응답 시간)
- Flash sale Spike (동시 재고 차감 정합성 검증)
- Rate Limiting 정확도 (Token Bucket 429 오차율)
