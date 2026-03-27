# LiveMart — 자율 배포 완성 작업 (2026-03-27)

## 실행 명령어

```bash
cd D:/project/livemart-clean
claude --dangerously-skip-permissions "BACKGROUND_TASK.md 파일을 읽고 남은 작업을 순서대로 완료해줘. 각 작업 후 git commit과 cd frontend && npx vercel --prod --yes 배포까지 진행해."
```

---

## 환경 정보

- **라이브 URL**: https://livemart-parkmin-jes-projects.vercel.app
- **레포지터리**: D:/project/livemart-clean (git main 브랜치)
- **데모 계정**: demo@livemart.com / demo123 (ADMIN 권한)
- **프론트엔드 경로**: D:/project/livemart-clean/frontend/
- **핵심 파일**: `frontend/src/app/api/[...path]/route.ts` (데모 API 전체)

## 커밋 규칙 (반드시 준수)

- Co-Authored-By 절대 금지
- 한국어 메시지
- 형식: `fix(frontend): 설명`

---

## 현재 상태 (완료 ✅ / 미완 ❌)

### 완료 ✅
- Vercel 배포 & 공개 URL
- 전체 데모 API 캐치올 (`[...path]/route.ts`)
- 상품 목록 / 이미지 / 검색 / 위시리스트
- 소셜 로그인 데모 안내 페이지 (`/oauth2/authorization/[provider]`)
- 회원가입 이메일 인증 (코드 123456, 모든 코드 통과)
- 회원가입 후 자동 로그인
- 로그인 후 홈 크래시 방어 (`AiRecommendations`)
- favicon (`/icon.tsx`)
- 쿠폰 관리 페이지 (`/admin/coupons`)
- 판매자 대시보드 (`/seller`)
- 알림 SSE

### 아직 미완 ❌ (이 순서대로 수정)
1. 로그인 응답에 `name` 필드 누락 → 로그인 후 `userName`이 "demo"로 저장됨
2. AI 추천 응답에 `category` 필드 누락 → 카테고리 배지가 `undefined`로 표시됨
3. `PATCH` 메서드 핸들러 없음 → 프로필 저장 클릭 시 405 오류
4. 재검토: 각 페이지 콘솔 에러 없는지 확인

---

## 작업 1: `route.ts` 3가지 버그 수정

파일: `frontend/src/app/api/[...path]/route.ts`

### 수정 1-A: 로그인 응답에 name 추가

현재 코드 (약 519~534줄):
```ts
  if (seg[0] === 'users' && seg[1] === 'login') {
    const token = makeDemoJwt('ADMIN');
    const response = NextResponse.json({
      accessToken: token,
      refreshToken: `demo-refresh-${Date.now()}`,
      userId: 1,
      role: 'ADMIN',
      _demo: true,
    });
```

변경할 코드:
```ts
  if (seg[0] === 'users' && seg[1] === 'login') {
    const token = makeDemoJwt('ADMIN');
    const response = NextResponse.json({
      accessToken: token,
      refreshToken: `demo-refresh-${Date.now()}`,
      userId: 1,
      name: '데모 관리자',
      role: 'ADMIN',
      _demo: true,
    });
```

### 수정 1-B: AI 추천 응답에 category 필드 추가

현재 코드 (약 476~484줄):
```ts
  if (seg[0] === 'ai') {
    if (seg[1] === 'recommend') {
      return ok({
        recommendations: DEMO_PRODUCTS.slice(0, 4).map(p => ({
          productId: p.id, productName: p.name,
          reason: '구매 이력 기반 추천 상품입니다.',
          imageUrl: p.imageUrl, price: p.price,
        })),
        reasoning: '최근 조회 및 구매 패턴 분석 기반',
        cached: false, _demo: true,
      });
    }
```

변경할 코드:
```ts
  if (seg[0] === 'ai') {
    if (seg[1] === 'recommend') {
      return ok({
        recommendations: DEMO_PRODUCTS.slice(0, 4).map(p => ({
          productId: p.id, productName: p.name,
          category: p.categoryName,
          reason: '구매 이력 기반 추천 상품입니다.',
          imageUrl: p.imageUrl, price: p.price,
        })),
        reasoning: '최근 조회 및 구매 패턴 분석 기반',
        cached: false, _demo: true,
      });
    }
```

### 수정 1-C: PATCH 핸들러 추가 (파일 맨 끝 `export async function DELETE` 아래에 추가)

파일 끝 부분 (약 749~751줄):
```ts
  return ok({ _demo: true });
}
```

이 아래에 추가:
```ts

// ─────────────────────────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────────────────────────

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const seg = path;

  // /api/users/me (프로필 수정)
  if (seg[0] === 'users' && seg[1] === 'me') {
    return ok({ message: '프로필이 수정되었습니다. (데모)', _demo: true });
  }

  return ok({ _demo: true });
}
```

---

## 작업 1 후 커밋 & 배포

```bash
cd D:/project/livemart-clean
git add frontend/src/app/api/
git commit -m "fix(frontend): 로그인 name 누락, AI 추천 category 누락, PATCH 핸들러 추가"
git push origin main
cd frontend && npx vercel --prod --yes
```

---

## 작업 2: 전체 페이지 Playwright 검증

로그인 상태에서 아래 페이지를 순서대로 방문하여 콘솔 TypeError가 없는지 확인한다.
URL: https://livemart-parkmin-jes-projects.vercel.app

**검증 페이지 목록:**
1. `/` — 홈 (Flash Sale, AI 추천, LiveActivityBar 확인)
2. `/products` — 상품 목록 (12개 상품 + 이미지 확인)
3. `/products/1` — 상품 상세 (리뷰, 장바구니 추가 확인)
4. `/search?q=이어폰` — 검색 결과
5. `/cart` — 장바구니
6. `/wishlist` — 위시리스트 (3개 항목)
7. `/my-orders` — 주문 내역 (3건)
8. `/orders/1` — 주문 상세
9. `/orders/new` — 주문/결제 (Toss 버튼 확인)
10. `/notifications` — 알림 (2건)
11. `/profile` — 프로필 (기본정보/보안/배송지 탭)
12. `/returns` — 반품/교환
13. `/admin` — 관리자 (대시보드/주문/쿠폰/회원/메트릭 탭)
14. `/admin/coupons` — 쿠폰 관리
15. `/admin/orders` — 주문 관리
16. `/admin/users` — 회원 관리
17. `/seller` — 판매자 대시보드
18. `/seller/inventory` — 재고 관리
19. `/health` — 서비스 상태
20. `/auth` — 로그인/회원가입 (소셜 버튼 확인)

**Playwright 사용 방법:**
```
mcp__playwright__browser_navigate → URL
mcp__playwright__browser_console_messages → 콘솔 에러 확인
mcp__playwright__browser_take_screenshot → 스크린샷 저장
```

**로그인 절차:**
```
1. browser_navigate → https://livemart-parkmin-jes-projects.vercel.app/auth
2. browser_fill_form → {email: "demo@livemart.com", password: "demo123"}
3. 로그인 버튼 클릭
4. 홈으로 이동 확인
```

---

## 작업 3: 발견된 버그 즉시 수정

Playwright 검증 중 TypeError나 빈 화면이 발견되면:

**수정 패턴:**
- API 응답 필드 누락: `route.ts` 에 필드 추가
- 컴포넌트 상태 오류: `setX(data.y ?? [])` 형태로 null 방어 추가
- 404 페이지: 해당 경로에 `page.tsx` 생성

**자주 발생하는 패턴:**
```ts
// 잘못된 코드 (API 응답이 배열 아닐 때 크래시)
setItems(data.items);

// 올바른 코드
setItems(Array.isArray(data.items) ? data.items : []);
```

---

## 작업 4: 최종 커밋 & 배포

발견된 모든 버그 수정 후:

```bash
cd D:/project/livemart-clean
git add frontend/src/
git commit -m "fix(frontend): 전체 페이지 배포 검증 및 잔여 버그 수정"
git push origin main
cd frontend && npx vercel --prod --yes
```

---

## 핵심 파일 참조

| 역할 | 경로 |
|------|------|
| 데모 API 전체 | `frontend/src/app/api/[...path]/route.ts` |
| 인증 폼 | `frontend/src/components/AuthForm.tsx` |
| 홈 서버 컴포넌트 | `frontend/src/app/page.tsx` |
| AI 추천 | `frontend/src/app/_components/AiRecommendations.client.tsx` |
| 미들웨어 | `frontend/src/middleware.ts` |
| Next.js 설정 | `frontend/next.config.js` |
| favicon | `frontend/src/app/icon.tsx` |

---

## API 엔드포인트 전체 목록 (route.ts 구현 현황)

### GET (구현됨 ✅)
- `/api/products` — 상품 목록 (페이지네이션, 검색, 카테고리 필터)
- `/api/products/search` — 키워드 검색
- `/api/products/search/autocomplete` — 자동완성
- `/api/products/{id}` — 상품 상세
- `/api/products/{id}/reviews` — 리뷰 목록
- `/api/products/{id}/reviews/summary` — 리뷰 요약
- `/api/users/me` — 내 정보
- `/api/users/count` — 회원 수 (admin)
- `/api/users/{id}` — 유저 정보
- `/api/users/{id}/cart` — 장바구니
- `/api/users/{id}/wishlist` — 위시리스트
- `/api/users/{id}/addresses` — 배송지 목록
- `/api/orders` — 주문 목록 (admin)
- `/api/orders/user/{id}` — 내 주문
- `/api/orders/number/{orderNumber}` — 주문번호 조회
- `/api/orders/{id}` — 주문 상세
- `/api/orders/query/statistics` — 주문 통계
- `/api/payments/order/{orderNumber}` — 결제 정보
- `/api/coupons` — 쿠폰 목록
- `/api/coupons/{code}` — 쿠폰 상세
- `/api/coupons/{code}/preview` — 할인 미리보기
- `/api/inventory/product/{id}` — 재고 조회
- `/api/recommendations/user/{id}` — 추천 상품
- `/api/delivery/{trackingNumber}` — 배송 추적
- `/api/returns/user/{id}` — 반품 목록
- `/api/analytics` — 분석 데이터
- `/api/analytics/stream` — SSE 스트림
- `/api/dashboard` — 대시보드
- `/api/dashboard/stream` — SSE 스트림
- `/api/sellers/{id}/dashboard` — 판매자 대시보드
- `/api/sellers/{id}/products` — 판매자 상품
- `/api/notifications/stream/{id}` — 알림 SSE
- `/api/notifications/user/{id}` — 알림 목록
- `/api/v1/*` — MFA 등 (enabled: false 반환)
- `/api/ai/recommend` — AI 추천 (POST도 구현)
- `*/health` — 헬스체크

### POST (구현됨 ✅)
- `/api/users/login` — 로그인 (JWT 쿠키 설정)
- `/api/users/signup` — 회원가입
- `/api/users/logout` — 로그아웃
- `/api/users/refresh` — 토큰 갱신
- `/api/users/email/send` — 인증 코드 발송 (데모: 123456)
- `/api/users/email/verify` — 인증 코드 확인 (항상 성공)
- `/api/users/{id}/cart` — 장바구니 추가
- `/api/users/{id}/wishlist` — 위시리스트 추가
- `/api/notifications/*` — 읽음 처리
- `/api/orders` — 주문 생성
- `/api/orders/{id}/cancel|confirm|ship|deliver` — 주문 상태 변경
- `/api/payments` — 결제 처리
- `/api/payments/refund` — 환불
- `/api/payments/toss/confirm` — Toss 결제 확인
- `/api/returns` — 반품 신청
- `/api/delivery` — 배송 생성
- `/api/sellers/apply` — 판매자 신청
- `/api/coupons` — 쿠폰 생성 (admin)
- `/api/products/{id}/reviews` — 리뷰 등록
- `/api/ai/recommend` — AI 추천 요청

### PUT (구현됨 ✅)
- `/api/products/{id}/stock` — 재고 수정
- `/api/users/{id}/cart/{productId}` — 장바구니 수량 수정
- `/api/coupons/{id}/toggle` — 쿠폰 활성/비활성
- `/api/notifications/user/{id}/read-all` — 전체 읽음

### DELETE (구현됨 ✅)
- `/api/users/{id}/cart` — 장바구니 전체 삭제
- `/api/users/{id}/cart/{productId}` — 장바구니 상품 삭제
- `/api/users/{id}/wishlist/{productId}` — 위시리스트 삭제
- `/api/products/{id}/reviews/{reviewId}` — 리뷰 삭제

### PATCH (❌ 작업 1에서 추가 예정)
- `/api/users/me` — 프로필 수정

---

## 주요 데모 데이터

- **상품**: 12개 (이어폰, 요가매트, 갈비탕, 체중계, 침구, 캐리어, 케이스, 녹차, 책상, 프로틴, 웹캠, 감귤)
- **주문**: 3건 (DELIVERED, SHIPPED, PENDING)
- **위시리스트**: 3개 항목
- **쿠폰**: 3개 (WELCOME10, SPRING5000, TECH15)
- **알림**: 2건 (ORDER_STATUS, PROMOTION)
- **리뷰**: 3건 (평점 4.7)
