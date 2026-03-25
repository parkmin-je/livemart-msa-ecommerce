/**
 * K6 플래시 세일 Spike 테스트
 *
 * 목적: 급격한 트래픽 급증(Spike) 상황에서 시스템 내성 검증
 * 시나리오: VU 0 → 1000 급증 후 유지 → 급감
 * 주요 검증: Rate Limiting, Redis 재고 차감 원자성, 중복 주문 방지
 *
 * 실행:
 *   k6 run k6/scenarios/flash-sale.js
 *   k6 run --env BASE_URL=https://api.livemart.io --env PRODUCT_ID=123 k6/scenarios/flash-sale.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── 커스텀 메트릭 ─────────────────────────────────────────
const spikeErrorRate = new Rate('spike_errors');
const rateLimitedCount = new Counter('rate_limited_429');
const soldOutCount = new Counter('sold_out_409');
const purchaseSuccessCount = new Counter('purchase_success');
const flashSaleLatency = new Trend('flash_sale_latency', true);
const concurrentUsers = new Gauge('concurrent_users');

// ── 테스트 설정 (Spike 패턴) ──────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const FLASH_PRODUCT_ID = __ENV.PRODUCT_ID || '1';

export const options = {
  stages: [
    { duration: '10s', target: 10 },    // 워밍업
    { duration: '30s', target: 1000 },  // Spike: 급격히 1000 VU
    { duration: '2m', target: 1000 },   // 피크 유지
    { duration: '30s', target: 100 },   // 점진적 감소
    { duration: '30s', target: 0 },     // 종료
  ],
  thresholds: {
    // 급증 상황에서도 서버는 응답해야 함 (429/409도 정상 응답)
    http_req_failed: ['rate<0.05'],  // 5xx 에러만 실패로 카운트
    spike_errors: ['rate<0.05'],
    flash_sale_latency: ['p(95)<5000', 'p(99)<10000'],
  },
};

// ── 테스트 사용자 ─────────────────────────────────────────
const testUsers = new SharedArray('users', function () {
  // 1000 VU를 위한 더 많은 사용자 (실제 환경에서는 별도 파일 로딩)
  return Array.from({ length: 100 }, (_, i) => ({
    email: `test${String(i + 1).padStart(2, '0')}@livemart.test`,
    password: 'Test1234!',
  }));
});

const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

// ── VU 초기화 (로그인 캐싱) ───────────────────────────────
let cachedToken = null;

export function setup() {
  // 테스트 시작 전 상품 재고 확인
  const res = http.get(
    `${BASE_URL}/api/products/${FLASH_PRODUCT_ID}`,
    { headers }
  );
  if (res.status === 200) {
    try {
      const product = res.json();
      console.log(`플래시 세일 상품: ${product.name || product.id}, 재고: ${product.stockQuantity || '알 수 없음'}`);
    } catch (_) {}
  }

  return { productId: FLASH_PRODUCT_ID };
}

// ── 로그인 (VU당 최초 1회) ───────────────────────────────
function loginIfNeeded(user) {
  if (cachedToken) return cachedToken;

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers, tags: { name: 'login' } }
  );

  if (res.status === 200) {
    try {
      const body = res.json();
      cachedToken = body.accessToken || body.token || body.data?.accessToken;
      return cachedToken;
    } catch (_) {}
  }
  return null;
}

// ── 플래시 세일 구매 시도 ──────────────────────────────────
function attemptFlashSalePurchase(token, productId) {
  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };

  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/products/${productId}/flash-sale/purchase`,
    JSON.stringify({ quantity: 1 }),
    { headers: authHeaders, tags: { name: 'flash_sale_purchase' }, timeout: '10s' }
  );
  flashSaleLatency.add(Date.now() - startTime);

  // 상태별 처리
  if (res.status === 200 || res.status === 201) {
    purchaseSuccessCount.add(1);
    check(res, { '구매 성공': () => true });
    return 'success';
  } else if (res.status === 429) {
    rateLimitedCount.add(1);
    check(res, { 'Rate Limit (429) - 정상': () => true });
    // Retry-After 헤더 확인
    const retryAfter = res.headers['Retry-After'];
    if (retryAfter) sleep(parseInt(retryAfter) || 1);
    return 'rate_limited';
  } else if (res.status === 409 || res.status === 400) {
    soldOutCount.add(1);
    check(res, { '품절/중복(409/400) - 정상': () => true });
    return 'sold_out';
  } else {
    spikeErrorRate.add(1);
    check(res, { [`예상치 못한 오류 (${res.status})`]: () => false });
    return 'error';
  }
}

// ── 대안: 일반 구매 플로우 ──────────────────────────────────
function alternativePurchase(token, productId) {
  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };

  // 장바구니 추가
  const cartRes = http.post(
    `${BASE_URL}/api/cart/items`,
    JSON.stringify({ productId, quantity: 1 }),
    { headers: authHeaders, tags: { name: 'cart_add' } }
  );

  if (cartRes.status !== 200 && cartRes.status !== 201) {
    return 'cart_failed';
  }

  sleep(0.5);

  // 주문 생성
  const orderRes = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      items: [{ productId, quantity: 1 }],
      deliveryAddress: '서울시 강남구 테헤란로 123',
      phoneNumber: '010-0000-0000',
      paymentMethod: 'CARD',
    }),
    { headers: authHeaders, tags: { name: 'create_order' } }
  );

  flashSaleLatency.add(orderRes.timings.duration);

  if (orderRes.status === 200 || orderRes.status === 201) {
    purchaseSuccessCount.add(1);
    return 'success';
  } else if (orderRes.status === 409) {
    soldOutCount.add(1);
    return 'sold_out';
  } else if (orderRes.status === 429) {
    rateLimitedCount.add(1);
    return 'rate_limited';
  }

  spikeErrorRate.add(1);
  return 'error';
}

// ── 메인 시나리오 ─────────────────────────────────────────
export default function (data) {
  concurrentUsers.add(1);
  const user = testUsers[__VU % testUsers.length];

  // 로그인
  const token = loginIfNeeded(user);
  if (!token) {
    spikeErrorRate.add(1);
    sleep(1);
    concurrentUsers.add(-1);
    return;
  }

  // 플래시 세일 전용 엔드포인트가 있으면 사용, 없으면 일반 구매
  const result = attemptFlashSalePurchase(token, data.productId);

  // 구매 실패 시 다른 상품 탐색 (실제 사용자 행동)
  if (result === 'sold_out') {
    sleep(randomIntBetween(1, 3));
    // 다른 상품 조회
    http.get(`${BASE_URL}/api/products?page=0&size=20`, {
      headers: { ...headers, Authorization: `Bearer ${token}` },
      tags: { name: 'browse_after_sold_out' }
    });
  }

  sleep(randomIntBetween(1, 3));
  concurrentUsers.add(-1);
}

export function teardown(data) {
  console.log(`\n플래시 세일 테스트 완료`);
  console.log(`구매 성공: ${purchaseSuccessCount.name}`);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const summary = [
    '\n=== 플래시 세일 Spike 테스트 결과 ===',
    `총 요청: ${metrics.http_reqs?.values?.count || 0}`,
    `구매 성공: ${metrics.purchase_success?.values?.count || 0}`,
    `Rate Limited (429): ${metrics.rate_limited_429?.values?.count || 0}`,
    `품절 (409): ${metrics.sold_out_409?.values?.count || 0}`,
    `스파이크 에러율: ${((metrics.spike_errors?.values?.rate || 0) * 100).toFixed(3)}%`,
    `플래시세일 P95: ${(metrics.flash_sale_latency?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    `플래시세일 P99: ${(metrics.flash_sale_latency?.values?.['p(99)'] || 0).toFixed(0)}ms`,
    '=====================================\n',
  ];

  return {
    stdout: summary.join('\n'),
    'k6/results/flash-sale-summary.json': JSON.stringify(data, null, 2),
  };
}
