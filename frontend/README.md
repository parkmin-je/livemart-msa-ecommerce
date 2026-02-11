# LiveMart Frontend

React + Next.js 14 기반 프론트엔드

## 주요 기능

- ✅ 상품 목록/검색 (Elasticsearch 연동)
- ✅ 장바구니 (Zustand 상태관리)
- ✅ 실시간 대시보드 (SSE 연동)
- ✅ 주문/결제
- ✅ OAuth 로그인 (Google, Kakao, Naver)

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: TailwindCSS
- **State**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **HTTP**: Axios
- **Charts**: Chart.js + React-Chartjs-2

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 환경 변수

`.env.local` 파일 생성:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 주요 컴포넌트

### ProductList
- Elasticsearch 실시간 검색
- 페이지네이션
- 카테고리 필터

### RealtimeDashboard
- SSE (Server-Sent Events) 연동
- 5초 간격 실시간 메트릭
- Chart.js 시각화

### CartSummary
- Zustand 장바구니 상태관리
- 분산 락 재고 확보 표시
- Saga Pattern 트랜잭션

## API 연동

모든 API는 `src/api/productApi.ts`에서 관리:

- **Product API**: 상품 CRUD
- **Order API**: 주문 처리
- **Auth API**: 인증/인가
- **Dashboard API**: 실시간 메트릭

## 실시간 기능

### SSE (Server-Sent Events)
```typescript
const eventSource = new EventSource('http://localhost:8087/api/v1/dashboard/stream');
eventSource.addEventListener('metrics', (event) => {
  const data = JSON.parse(event.data);
  // 실시간 메트릭 업데이트
});
```

### WebSocket (재고 업데이트)
상품 카드에 실시간 재고 업데이트 표시

## 성능 최적화

- React Query 캐싱 (1분)
- 이미지 Lazy Loading
- TailwindCSS JIT
- Next.js 자동 코드 스플리팅
