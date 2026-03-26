# Incident Response Guide

> 장애 발생 시 표준 대응 절차입니다. 패닉하지 말고 순서대로 진행하세요.

---

## 5단계 대응 프로세스

```
탐지(Detect) → 분류(Triage) → 격리(Contain) → 복구(Resolve) → 회고(Review)
```

---

## 1단계: 탐지 (Detect)

**알림 채널:**
- Grafana Alert → Slack `#livemart-alerts`
- PagerDuty 호출 (P1/P2)
- 고객 리포트 → Slack `#livemart-support`

**첫 번째 확인 사항 (5분 이내):**

```bash
# 전체 Pod 상태 한눈에 보기
kubectl get pods -n livemart

# 최근 이벤트 확인
kubectl get events -n livemart --sort-by='.lastTimestamp' | tail -20

# 서비스 헬스 체크 전체
for svc in api-gateway order-service payment-service product-service user-service; do
  echo -n "$svc: "
  kubectl exec -n livemart deploy/api-gateway -- \
    curl -sf http://$svc/actuator/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])" 2>/dev/null || echo "UNREACHABLE"
done
```

---

## 2단계: 분류 (Triage)

**심각도 판단 기준:**

| 질문 | Yes → |
|------|--------|
| 결제가 처리되지 않는가? | P1 |
| 전체 주문 생성이 불가한가? | P1 |
| 데이터 유실/오염이 의심되는가? | P1 |
| 특정 서비스만 영향받는가? | P2 |
| 일부 사용자만 영향받는가? | P2/P3 |
| 성능 저하만 있는가? | P3 |

**인시던트 채널 생성:**
```
Slack: /incident create livemart-[날짜]-[간단설명]
예시: #incident-20260317-payment-timeout
```

---

## 3단계: 격리 (Contain)

### 트래픽 차단 (최후 수단)

```bash
# 특정 서비스로의 트래픽 차단 (Istio VirtualService)
kubectl patch vs payment-service -n livemart --type='json' \
  -p='[{"op":"replace","path":"/spec/http/0/fault/abort/httpStatus","value":503}]'

# api-gateway에서 특정 경로 차단
# → api-gateway RoutePredicateFactory 설정 변경
```

### 읽기 전용 모드 전환

```bash
# Feature Flag로 쓰기 작업 비활성화 (Redis)
kubectl exec -n livemart deploy/redis-0 -- \
  redis-cli SET "feature:order:write:enabled" "false"
```

---

## 4단계: 복구 (Resolve)

체크리스트:

- [ ] 서비스 정상화 확인 (헬스체크 전체 green)
- [ ] Kafka Consumer Lag 정상 복구 확인
- [ ] DLT 메시지 재처리 완료 확인
- [ ] SLO 지표 정상 범위 복귀 확인
- [ ] 누락된 주문/결제 데이터 정합성 검증
- [ ] 고객 공지 (영향받은 사용자 대상)
- [ ] 모니터링 알림 정상화 확인

---

## 5단계: 회고 (Post-Mortem)

**작성 기한:** 장애 종료 후 48시간 이내

**회고 문서 위치:** `docs/post-mortems/YYYY-MM-DD-제목.md`

**필수 포함 항목:**

```markdown
# Post-Mortem: [인시던트 제목]

## 타임라인
- HH:MM — 최초 알림 발생
- HH:MM — 인시던트 확인 및 분류
- HH:MM — 원인 특정
- HH:MM — 복구 완료

## 영향 범위
- 영향받은 사용자 수
- 서비스 다운타임
- 데이터 유실 여부

## 근본 원인 (Root Cause)

## 기여 요인 (Contributing Factors)

## 즉각 조치 사항

## 재발 방지 액션 아이템
| 항목 | 담당자 | 기한 |
|------|--------|------|
| ... | @... | YYYY-MM-DD |
```

---

*최종 업데이트: 2026-03-17 | 담당: @parkmin-je*
