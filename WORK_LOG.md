# LiveMart 작업 로그

## 시작일: 2026-03-24
## 최종 업데이트: 2026-03-25

---

## PHASE SECURITY — OWASP 취약점 전면 수정 및 프론트엔드 기능 보완 (2026-03-25)

### 브랜치: fix/ci-branch-trigger-and-yaml-syntax

#### CRITICAL 수정

1. **주문 IDOR 수정 (CVSS 9.1)**
   - `order-service/OrderController.java`: `getOrder`, `getOrderByNumber`, `getOrdersByUserId` 에 소유자 검증 추가
   - `GET /api/orders` — 일반 사용자는 본인 주문만, ADMIN은 전체 목록
   - `extractUserId()`, `hasAdminRole()` 헬퍼 메서드 추가
   - `Authentication` 파라미터 주입으로 JWT 소유자 검증

2. **결제 금액 서버 검증 (CVSS 9.3)**
   - `payment-service/build.gradle`: openfeign + loadbalancer 의존성 추가
   - `PaymentServiceApplication.java`: `@EnableFeignClients` 추가
   - `payment-service/client/OrderFeignClient.java`: 신규 생성
   - `payment-service/dto/OrderInfo.java`: 신규 생성
   - `PaymentController.java`: 결제 전 order-service 금액 검증, 중복 결제 방지

3. **재고 Race Condition 수정 (CVSS 9.0)**
   - `InventoryService.java`: `decrementStock()` 메서드 추가 (Redisson 분산 락)
   - `InventoryController.java`: `POST /api/v1/inventory/decrement` 엔드포인트 추가

#### HIGH 수정

4. **장바구니/위시리스트 IDOR 수정 (CVSS 7.5)**
   - `CartController.java`: 모든 엔드포인트에 `validateUserAccess()` 소유자 검증 추가
   - `WishlistController.java`: 동일하게 소유자 검증 추가
   - `AddressController.java`: 이미 `@PreAuthorize` 적용되어 있었음

5. **Actuator 엔드포인트 최소화**
   - `api-gateway/application.yml`: `gateway` 노출 제거, `health.show-details: when-authorized`, `gateway.enabled: false`

6. **쿠키 Secure 플래그 기본값 수정**
   - `user-service/application.yml`: `COOKIE_SECURE` 기본값 `false` → `true` (프로덕션 안전)

#### MEDIUM 수정

7. **Elasticsearch 쿼리 인젝션 방어**
   - `ProductController.java`: `sanitizeSearchInput()` 추가, 검색/자동완성/퍼지검색에 적용

8. **JWT 파싱 Jackson으로 교체**
   - `RateLimitFilter.java`: 정규식 기반 `sub` 클레임 추출 → `extractUserIdFromToken()` Jackson 파싱으로 교체

9. **Rate Limit Fail-Closed 정책**
   - `RateLimitFilter.java`: `onErrorResume` 수정 — `/api/payments`, `/api/orders`는 Redis 없으면 503 반환

10. **Swagger 프로덕션 비활성화**
    - `user-service/application.yml`, `product-service/application.yml`, `order-service/application.yml`: `SWAGGER_ENABLED` 기본값 `false`

11. **이미지 매직바이트 검증**
    - `ImageUploadController.java`: JPEG/PNG/GIF/WebP 매직바이트 시그니처 검증 추가

12. **민감정보 로그 수정**
    - `user-service`, `order-service`, `product-service` `application.yml`: `show-sql: false`

#### 기능 추가

13. **관리자 메트릭 대시보드**
    - `frontend/src/app/api/admin/metrics/route.ts`: Prometheus HTTP API 쿼리 Next.js API route
    - `frontend/src/app/admin/page.tsx`: 메트릭 탭 추가 (응답시간 p50/p95/p99, 처리량, Redis 히트율, Kafka 랙, 오늘 매출)

14. **429 Rate Limit UI 개선**
    - `frontend/src/api/productApi.ts`: axios interceptor에 429 처리 + Retry-After 기반 안내 + 자동 재시도

15. **2FA TOTP 설정 UI 완성**
    - `frontend/src/app/profile/page.tsx`: 완전한 TOTP 설정 모달 (QR 스캔 → OTP 검증 → 백업 코드 저장)

16. **실시간 재고 polling**
    - `frontend/src/app/products/[id]/page.tsx`: 30초 polling, 재고 5개 미만 경고, 품절 임박 배지

17. **보안 헤더 미들웨어**
    - `frontend/src/middleware.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`

18. **공통 입력값 검증 유틸리티**
    - `common/src/main/java/com/livemart/common/validation/InputSanitizer.java`: XSS, ES 인젝션, 이메일/전화/URL 검증

---

## PHASE X — 2026 백엔드 엔지니어 우대 기술 스택 전면 추가 (2026-03-25)

### 커밋: 6c36c12 (fix/ci-branch-trigger-and-yaml-syntax)

#### 완료 항목

1. **Terraform IaC 보강**
   - `terraform/modules/msk/`: Amazon MSK Kafka 3-브로커, IAM SASL, 로그 설정
   - `terraform/modules/opensearch/`: OpenSearch 3-노드, Fine-grained Access Control, CloudWatch 로그
   - `terraform/modules/s3/`: 상품이미지/로그아카이브/AI에셋 버킷, 수명주기 정책
   - `terraform/modules/iam/`: IRSA (External Secrets, ALB Controller, Cluster Autoscaler, product/ai 서비스)
   - `terraform/environments/production/main.tf`: 프로덕션 환경 전체 모듈 조합
   - `terraform/.terraform-version`: 1.9.0

2. **K6 부하 테스트 시나리오 (k6/scenarios/)**
   - `product-load.js`: 상품 목록/상세 100→500 VU, p95<2s 임계값
   - `order-flow.js`: 로그인→장바구니→주문 전체 플로우
   - `flash-sale.js`: 0→1000 VU Spike, Rate Limit/품절 응답 검증
   - `search-load.js`: 전문검색/자동완성/AI검색 복합

3. **GitHub Actions Load Test CI** (`.github/workflows/load-test.yml`)
   - PR to main 자동, workflow_dispatch 수동
   - 임계값 초과 시 PR 차단
   - 결과를 PR 코멘트로 자동 게시

4. **Spring AI 패턴 구현** (`ai-service`)
   - `ProductVectorStoreService`: add/similaritySearch + RAG 패턴
   - `OpenAiClient`: createEmbedding(text-embedding-3-small), chatCompletion 메서드 추가

5. **Jaeger OTLP 분산 추적**
   - `docker-compose.yml`: Jaeger 컨테이너 추가 (4317/4318 OTLP)
   - 6개 서비스: Zipkin → Jaeger OTLP HTTP 전환
   - `k8s/infra/jaeger.yml`: K8s 배포

6. **CQRS/DDD 명시적 구현** (`order-service/application/`, `domain/`)
   - DomainEvent 인터페이스 + 3개 이벤트 구현체
   - OrderId/Money/Address Value Object
   - Command/Query 객체 6개
   - CreateOrderCommandHandler, GetOrderQueryHandler

7. **Rate Limiting 고도화** (`api-gateway`)
   - `lua/sliding-window-rate-limit.lua`: Lua 원자적 처리
   - `RateLimitFilter`: 사용자/IP/엔드포인트별 차등 제한, Retry-After 헤더

8. **OpenTelemetry 커스텀 스팬** (`common/telemetry/LivemartSpanDecorator.java`)
   - user.id/order.id/product.id 비즈니스 태그
   - Kafka Producer/Consumer, Redis 캐시 추적

9. **Grafana 대시보드**
   - `livemart-slo.json`: 가용성 SLO/레이턴시 SLO/Error Budget/Rate Limit 패널
   - `provisioning/dashboards/dashboards.yml`
   - `datasources.yml`: Jaeger 데이터소스 추가

10. **External Secrets Operator** (`k8s/base/eso-complete-config.yml`)
    - ClusterSecretStore + 9개 ExternalSecret (1시간 자동 갱신)

11. **SonarQube Quality Gate** (`.github/workflows/ci.yml`)
    - 커버리지 80% 강제, main PR 시 차단

---

## PHASE 1 — 동태 파악 완료

### 파악된 현황

#### 전체 아키텍처
- Next.js 15 App Router + TypeScript
- Zustand (cartStore persist), TanStack Query (useQuery)
- react-hot-toast 사용
- Tailwind CSS + custom CSS variables
- API: Next.js rewrites → api-gateway(8888) 프록시

#### 페이지별 구현 상태
- `/` (홈): 완성. Server Component + 다수의 Client Component. TypeScript 오류 없음.
- `/products`: ProductList 컴포넌트, 정렬/카테고리 필터, 페이지네이션 완성
- `/products/[id]`: 상세페이지, 이미지 갤러리, 리뷰 시스템, 연관상품 완성
- `/cart`: 쿠폰 적용, 선택/전체선택, 수량 조절 완성
- `/orders/new`: OrderForm 컴포넌트 (주문/결제 폼)
- `/auth`: AuthForm 컴포넌트
- `/notifications`: SSE + REST polling, 지수 백오프 재연결
- `/wishlist`: 로그인 체크, 상품 추가/제거
- `/search`: Elasticsearch fallback, 가격/카테고리 필터
- `/seller`: 셀러 대시보드 + SellerAgentPanel
- `/profile`: 다중 탭 (정보/보안/주소)
- `/returns`: 반품 신청/내역 조회

#### 주요 컴포넌트
- `GlobalNav`: 메가 메뉴, 모바일 하단 네비, 검색 자동완성
- `ProductCard`: 할인 배지, 위시리스트, 장바구니, 로딩 스켈레톤
- `ProductList`: 정렬, 그리드/리스트뷰, 페이지네이션
- `CartSummary`: 플로팅 장바구니 버튼
- `LiveActivityBar`: SSE + REST polling 실시간 메트릭
- `HeroBanner`: 3슬라이드 캐러셀, 진행률 바
- `FlashSaleSection`: 카운트다운 타이머, 할인 상품 스크롤
- `RecentlyViewedSection`: localStorage 저장/조회
- `AiRecommendations`: GPT-4o-mini 기반 추천
- `WelcomeCouponBanner`: 신규회원 쿠폰

#### TypeScript/빌드 상태
- `npx tsc --noEmit`: **오류 없음 (0개)**
- `npx next build`: **성공** (모든 페이지 빌드 완료)

---

## PHASE 2 — 오류 수정 완료

### 수정 사항
- TypeScript 오류: 없음 (0개)
- Next.js 빌드: 성공

---

## PHASE 3/4/5 — 기능 추가 구현 완료

### 구현 완료 항목

#### products/[id]/page.tsx
- 상품 Q&A 탭 (문의 목록/등록/비밀글, mock fallback)
- 재입고 알림 버튼 (localStorage 상태 저장)
- 상품 비교하기 (최대 3개, localStorage)
- 공유하기 버튼 (navigator.share / clipboard)
- 이미지 갤러리 (좌우 화살표, 썸네일)
- 로켓배송 배달 시간 표시 (오후 2시 기준)
- 포인트 적립 안내 (구매가의 1%)

#### orders/[id]/page.tsx
- 주문 취소 기능 (사유 선택 모달)
- 배송 상태 진행 표시 (4단계 스텝)
- 30초 polling 자동 새로고침
- 포인트 적립 안내 (배송완료 시)

#### layout.tsx
- RecentlyViewedFloating 컴포넌트 추가 (오늘 본 상품 플로팅 버튼)

#### RecentlyViewedFloating.tsx (신규)
- localStorage 기반 최근 본 상품 플로팅 패널
- 슬라이드업 애니메이션, 목록 비우기, 카운트 뱃지

---

## PHASE 6 — 최종 검증 완료

### 검증 결과
- TypeScript: 오류 0개 (`npx tsc --noEmit`)
- Next.js 빌드: 성공 (전 페이지 정상 빌드)
- 스크린샷 확인:
  - `/`: 홈 (Hero 배너, Flash Sale, 실시간 활동 표시)
  - `/products`: 상품 목록 (카테고리 필터, 그리드)
  - `/products/1`: 상품 상세 (스켈레톤 - API 미연결 환경)
  - `/cart`: 장바구니 비어있음 상태
  - `/auth`: 로그인/회원가입 폼
  - `/seller`: 판매자 대시보드
  - `/notifications`: 알림 (비로그인 시 로그인 유도)

---

## PHASE 7 — 커밋 & 푸시 완료

브랜치: fix/ci-branch-trigger-and-yaml-syntax
