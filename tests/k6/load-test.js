/**
 * LiveMart K6 Load Test
 * 목적: 일반 운영 부하 (평균 트래픽) 하에서 성능 측정
 * 실행: k6 run load-test.js
 * 소요: ~12분
 *
 * 시나리오:
 *   0→30 VU (ramp-up 2m) → 30 VU 유지 (8m) → 0 (ramp-down 2m)
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

// ── 커스텀 메트릭 ──────────────────────────────────────────
const loginDuration = new Trend("login_duration");
const productListDuration = new Trend("product_list_duration");
const orderCreateDuration = new Trend("order_create_duration");
const errorRate = new Rate("error_rate");
const orderSuccessCount = new Counter("order_success_count");

// ── 테스트 데이터 ──────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

const testUsers = new SharedArray("users", function () {
  return [
    { email: "test01@livemart.test", password: "Test1234!" },
    { email: "test02@livemart.test", password: "Test1234!" },
    { email: "test03@livemart.test", password: "Test1234!" },
    { email: "test04@livemart.test", password: "Test1234!" },
    { email: "test05@livemart.test", password: "Test1234!" },
  ];
});

// ── 설정 ───────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: "2m", target: 30 },   // Ramp-up: 0→30 VU
    { duration: "8m", target: 30 },   // Steady: 30 VU 유지
    { duration: "2m", target: 0 },    // Ramp-down: 30→0 VU
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],             // 실패율 5% 미만
    http_req_duration: ["p(95)<3000"],          // P95 3초 미만
    "http_req_duration{endpoint:products}": ["p(95)<1000"],
    "http_req_duration{endpoint:login}": ["p(95)<2000"],
    "http_req_duration{endpoint:order}": ["p(95)<5000"],
    error_rate: ["rate<0.05"],
  },
};

// ── 메인 시나리오 ──────────────────────────────────────────
export default function () {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  let token = null;

  // ── 그룹 1: 비회원 상품 브라우징 ─────────────────────────
  group("상품 브라우징 (비회원)", function () {
    // 메인 상품 목록
    const listRes = http.get(`${BASE_URL}/api/products?page=0&size=20`, {
      tags: { endpoint: "products" },
    });
    check(listRes, {
      "상품 목록 조회 성공": (r) => r.status === 200,
    });
    productListDuration.add(listRes.timings.duration);
    errorRate.add(listRes.status >= 500);

    sleep(randomSleep(1, 3));

    // 카테고리 필터
    const categories = ["electronics", "fashion", "food", "beauty"];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const catRes = http.get(
      `${BASE_URL}/api/products?category=${cat}&page=0&size=12`,
      { tags: { endpoint: "products" } }
    );
    check(catRes, { "카테고리 필터 성공": (r) => r.status === 200 });
    errorRate.add(catRes.status >= 500);

    sleep(randomSleep(0.5, 2));

    // 상품 상세 (랜덤 ID 1~100)
    const productId = Math.floor(Math.random() * 100) + 1;
    const detailRes = http.get(`${BASE_URL}/api/products/${productId}`, {
      tags: { endpoint: "product_detail" },
    });
    check(detailRes, {
      "상품 상세 조회 성공 (2xx or 404)": (r) =>
        r.status === 200 || r.status === 404,
    });
    errorRate.add(detailRes.status >= 500);
  });

  sleep(randomSleep(1, 2));

  // ── 그룹 2: 로그인 ────────────────────────────────────────
  group("로그인", function () {
    const loginRes = http.post(
      `${BASE_URL}/api/users/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "login" },
      }
    );
    loginDuration.add(loginRes.timings.duration);
    errorRate.add(loginRes.status >= 500);

    if (loginRes.status === 200) {
      try {
        token = JSON.parse(loginRes.body).accessToken;
      } catch {
        // 로그인 실패 허용
      }
    }
    check(loginRes, {
      "로그인 성공 (200 or 401)": (r) =>
        r.status === 200 || r.status === 401,
    });
  });

  if (!token) {
    sleep(randomSleep(2, 4));
    return; // 로그인 실패 시 주문 시나리오 스킵
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  sleep(randomSleep(1, 2));

  // ── 그룹 3: 장바구니 → 주문 ──────────────────────────────
  group("장바구니 및 주문", function () {
    // 장바구니 조회
    const cartRes = http.get(`${BASE_URL}/api/cart`, {
      headers: authHeaders,
      tags: { endpoint: "cart" },
    });
    check(cartRes, {
      "장바구니 조회 성공": (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(cartRes.status >= 500);

    sleep(randomSleep(1, 3));

    // 주문 생성 (10% 확률로만 실제 주문)
    if (Math.random() < 0.1) {
      const orderPayload = {
        items: [
          {
            productId: Math.floor(Math.random() * 50) + 1,
            quantity: 1,
          },
        ],
        shippingAddress: {
          recipient: "테스트 사용자",
          phone: "010-0000-0000",
          zipCode: "06235",
          address: "서울시 강남구 테헤란로 123",
          detailAddress: "101호",
        },
        paymentMethod: "VIRTUAL_ACCOUNT",
      };

      const orderRes = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify(orderPayload),
        { headers: authHeaders, tags: { endpoint: "order" } }
      );
      orderCreateDuration.add(orderRes.timings.duration);
      errorRate.add(orderRes.status >= 500);

      if (orderRes.status === 201 || orderRes.status === 200) {
        orderSuccessCount.add(1);
      }
      check(orderRes, {
        "주문 생성 응답 정상": (r) =>
          r.status === 200 || r.status === 201 || r.status === 400,
      });
    }
  });

  sleep(randomSleep(2, 5));
}

function randomSleep(min, max) {
  return Math.random() * (max - min) + min;
}

// ── 요약 ───────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    "load-test-result.json": JSON.stringify(data, null, 2),
  };
}
