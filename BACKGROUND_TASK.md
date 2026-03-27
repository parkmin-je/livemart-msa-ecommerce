# LiveMart — 자율 작업 인수인계 문서 (2026-03-27)

## 실행 명령어

```bash
cd D:/project/livemart-clean
claude --dangerously-skip-permissions "BACKGROUND_TASK.md 파일을 읽고 남은 작업을 순서대로 완료해줘. 각 작업 후 git commit과 cd frontend && npx vercel --prod --yes 배포까지 진행해."
```

---

## 현재 상태

- **라이브**: https://livemart-parkmin-jes-projects.vercel.app
- **GitHub**: https://github.com/parkmin-je/livemart-msa-ecommerce (main 브랜치)
- **데모 계정**: demo@livemart.com / demo123 (ADMIN)

### 완료 ✅
- Vercel 배포, 공개 URL
- 전체 데모 API 캐치올 (`frontend/src/app/api/[...path]/route.ts`)
- 상품 목록·이미지·검색·위시리스트·쿠폰관리·알림·판매자 대시보드
- 소셜 로그인 데모 안내 페이지
- 회원가입 이메일 인증 (코드: 123456, 어떤 코드든 통과)
- 로그인 후 홈 크래시 방어 코드 추가

### 아직 미완 ❌
1. 로그인 후 홈 크래시 (다른 컴포넌트도 확인 필요)
2. 회원가입 후 자동 로그인 안 됨
3. favicon 404
4. 각 페이지 잔여 콘솔 에러

---

## 작업 순서

### 작업 1: 로그인 후 홈 크래시 완전 수정

Playwright로 /auth 접속 → demo@livemart.com / demo123 로그인 → 홈 콘솔 에러 확인.
에러가 있으면 해당 컴포넌트에서 배열/객체 null 방어 추가.

확인 파일:
- `frontend/src/app/_components/RecentlyViewedSection.client.tsx`
- `frontend/src/app/_components/WelcomeCouponBanner.client.tsx`
- `frontend/src/app/_components/AiRecommendations.client.tsx`
- `frontend/src/app/_components/FlashSaleSection.client.tsx`

수정 패턴: `setItems(data.arr)` → `setItems(Array.isArray(data.arr) ? data.arr : [])`

### 작업 2: 회원가입 후 자동 로그인

파일: `frontend/src/components/AuthForm.tsx` (line ~140, 회원가입 성공 처리 부분)

회원가입 성공 후 자동으로 `/api/users/login` 호출하여 localStorage에 userId/userName/userRole 저장 후 `/`로 이동.

### 작업 3: favicon 추가

`frontend/src/app/icon.tsx` 파일 생성:
```tsx
import { ImageResponse } from 'next/og';
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export default function Icon() {
  return new ImageResponse(
    <div style={{ background: '#E8001D', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 900 }}>L</div>
  );
}
```

### 작업 4: 전체 페이지 Playwright 검증 후 에러 수정

로그인 상태에서 아래 페이지 방문하여 콘솔 TypeError 없는지 확인:
/, /products, /products/1, /cart, /my-orders, /wishlist, /notifications,
/profile, /admin, /admin/coupons, /admin/orders, /seller, /seller/inventory,
/search, /returns, /health

에러 발견 시 즉시 해당 파일 수정.

### 작업 5: 커밋 & 배포

```bash
cd D:/project/livemart-clean
git add frontend/src/
git commit -m "fix(frontend): 전체 페이지 완전 동작 검증 및 잔여 버그 수정"
git push origin main
cd frontend && npx vercel --prod --yes
```

---

## 핵심 파일

| 역할 | 경로 |
|------|------|
| 데모 API 전체 | `frontend/src/app/api/[...path]/route.ts` |
| 인증 폼 | `frontend/src/components/AuthForm.tsx` |
| 홈 서버 컴포넌트 | `frontend/src/app/page.tsx` |
| 미들웨어 | `frontend/src/middleware.ts` |
| Next.js 설정 | `frontend/next.config.js` |

## 커밋 규칙

- Co-Authored-By 절대 금지
- 한국어 메시지
- 형식: `fix(frontend): 설명`
