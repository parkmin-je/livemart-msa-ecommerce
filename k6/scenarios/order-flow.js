/**
 * K6 주문 플로우 부하 테스트
 *
 * 목적: 로그인 → 장바구니 → 주문 생성 전체 플로우 성능 검증
 * 시나리오: 실제 사용자 행동 패턴 시뮬레이션
 * 임계값: 주문 생성 p(95) < 3s, 결제 p(95) < 5s, 에러율 < 0.5%
 *
 * 실행:
 *   k6 run k6/scenarios/order-flow.js
 *   k6 run --env BASE_URL=https://api.livemart.io k6/scenarios/order-flow.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── 커스텀 메트릭 ─────────────────────────────────────────
const loginDuration = new Trend('login_duration', true);
const cartAddDuration = new Trend('cart_add_duration', true);
const orderCreateDuration = new Trend('order_create_duration', true);
const orderErrorRate = new Rate('order_errors');
const orderSuccessCount = new Counter('order_success_count');
const loginSuccessCount = new Counter('login_success_count');

// ── 테스트 설정 ───────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp-up
    { duration: '3m', target: 50 },   // 정상 부하
    { duration: '2m', target: 100 },  // 높은 부하
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.005'],
    order_errors: ['rate<0.005'],
    login_duration: ['p(95)<2000'],
    cart_add_duration: ['p(95)<1000'],
    order_create_duration: ['p(95)<3000'],
  },
};

// ── 테스트 사용자 (SharedArray = VU 간 공유, 메모리 효율) ──
const testUsers = new SharedArray('users', function () {
  return [
    { email: 'test01@livemart.test', password: 'Test1234!' },
    { email: 'test02@livemart.test', password: 'Test1234!' },
    { email: 'test03@livemart.test', password: 'Test1234!' },
    { email: 'test04@livemart.test', password: 'Test1234!' },
    { email: 'test05@livemart.test', password: 'Test1234!' },
    { email: 'test06@livemart.test', password: 'Test1234!' },
    { email: 'test07@livemart.test', password: 'Test1234!' },
    { email: 'test08@livemart.test', password: 'Test1234!' },
    { email: 'test09@livemart.test', password: 'Test1234!' },
    { email: 'test10@livemart.test', password: 'Test1234!' },
  ];
});

const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

// ── 1단계: 로그인 ──────────────────────────────────────────
function login(user) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers, tags: { name: 'login' } }
  );

  loginDuration.add(res.timings.duration);

  const success = check(res, {
    '로그인 성공 (200)': (r) => r.status === 200,
    '토큰 반환': (r) => {
      try {
        const body = r.json();
        return !!(body.accessToken || body.token || body.data?.accessToken);
      } catch (_) {
        return false;
      }
    },
  });

  if (!success) {
    orderErrorRate.add(1);
    return null;
  }

  loginSuccessCount.add(1);
  try {
    const body = res.json();
    return body.accessToken || body.token || body.data?.accessToken;
  } catch (_) {
    return null;
  }
}

// ── 2단계: 상품 목록에서 랜덤 상품 선택 ─────────────────────
function getRandomProduct(token) {
  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };
  const page = randomIntBetween(0, 5);

  const res = http.get(
    `${BASE_URL}/api/products?page=${page}&size=20`,
    { headers: authHeaders, tags: { name: 'browse_products' } }
  );

  if (res.status !== 200) return null;

  try {
    const data = res.json();
    const products = data.content || data.products || data.data || [];
    if (products.length === 0) return null;
    return products[randomIntBetween(0, products.length - 1)];
  } catch (_) {
    return null;
  }
}

// ── 3단계: 장바구니에 상품 추가 ──────────────────────────────
function addToCart(token, productId, quantity = 1) {
  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };

  const res = http.post(
    `${BASE_URL}/api/cart/items`,
    JSON.stringify({ productId, quantity }),
    { headers: authHeaders, tags: { name: 'add_to_cart' } }
  );

  cartAddDuration.add(res.timings.duration);

  return check(res, {
    '장바구니 추가 성공': (r) => r.status === 200 || r.status === 201,
  });
}

// ── 4단계: 장바구니 조회 ─────────────────────────────────────
function getCart(token) {
  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };

  const res = http.get(
    `${BASE_URL}/api/cart`,
    { headers: authHeaders, tags: { name: 'get_cart' } }
  );

  if (res.status !== 200) return null;

  try {
    return res.json();
  } catch (_) {
    return null;
  }
}

// ── 5단계: 주문 생성 ──────────────────────────────────────────
function createOrder(token, cartItems) {
  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };

  const orderPayload = {
    items: cartItems.slice(0, 3).map((item) => ({
      productId: item.productId || item.id,
      quantity: item.quantity || 1,
    })),
    deliveryAddress: '서울시 강남구 테헤란로 123',
    phoneNumber: '010-1234-5678',
    paymentMethod: 'CARD',
    orderNote: 'K6 부하 테스트 주문',
  };

  const res = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify(orderPayload),
    { headers: authHeaders, tags: { name: 'create_order' } }
  );

  orderCreateDuration.add(res.timings.duration);

  const success = check(res, {
    '주문 생성 성공 (200/201)': (r) => r.status === 200 || r.status === 201,
    '주문번호 반환': (r) => {
      try {
        const body = r.json();
        return !!(body.orderNumber || body.data?.orderNumber || body.id);
      } catch (_) {
        return false;
      }
    },
  });

  orderErrorRate.add(!success);
  if (success) orderSuccessCount.add(1);

  return success;
}

// ── 메인 시나리오 ─────────────────────────────────────────
export default function () {
  const user = testUsers[__VU % testUsers.length]; // VU 인덱스로 사용자 배분

  // 1. 로그인
  let token;
  group('로그인', function () {
    token = login(user);
  });

  if (!token) {
    sleep(2);
    return; // 로그인 실패 시 조기 종료
  }

  sleep(randomIntBetween(1, 2));

  // 2. 상품 브라우징
  let product;
  group('상품 탐색', function () {
    product = getRandomProduct(token);
    sleep(randomIntBetween(2, 5)); // 사용자가 상품 보는 시간
  });

  if (!product) {
    sleep(2);
    return;
  }

  // 3. 장바구니 추가
  group('장바구니 추가', function () {
    const quantity = randomIntBetween(1, 3);
    addToCart(token, product.id || product.productId, quantity);
    sleep(randomIntBetween(1, 2));
  });

  // 4. 장바구니 확인 (10% 확률로 상품 추가)
  let cartData;
  group('장바구니 확인', function () {
    cartData = getCart(token);

    if (Math.random() < 0.1 && product) {
      const anotherProduct = getRandomProduct(token);
      if (anotherProduct) {
        addToCart(token, anotherProduct.id || anotherProduct.productId, 1);
      }
    }
    sleep(randomIntBetween(1, 3));
  });

  // 5. 주문 생성 (70% 확률 — 모든 사용자가 구매하지 않음)
  if (Math.random() < 0.7 && cartData) {
    group('주문 생성', function () {
      const items = cartData.items || cartData.data?.items || [{ productId: product.id, quantity: 1 }];
      createOrder(token, items);
      sleep(randomIntBetween(2, 4));
    });
  }

  sleep(randomIntBetween(5, 10));
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const summary = [
    '\n=== 주문 플로우 부하 테스트 결과 ===',
    `총 요청: ${metrics.http_reqs?.values?.count || 0}`,
    `주문 성공: ${metrics.order_success_count?.values?.count || 0}`,
    `로그인 성공: ${metrics.login_success_count?.values?.count || 0}`,
    `주문 에러율: ${((metrics.order_errors?.values?.rate || 0) * 100).toFixed(3)}%`,
    `주문 생성 P95: ${(metrics.order_create_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    `로그인 P95: ${(metrics.login_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    '=====================================\n',
  ];

  return {
    stdout: summary.join('\n'),
    'k6/results/order-flow-summary.json': JSON.stringify(data, null, 2),
  };
}
