/**
 * LiveMart K6 Spike Test
 * 목적: 순간 급증 트래픽 (flash sale, 라이브 방송) 대응 능력 검증
 * 실행: k6 run spike-test.js
 * 소요: ~10분
 *
 * 시나리오: 라이브 방송 시작 → 갑작스러운 주문 폭주
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const API_KEY = __ENV.API_KEY || "";

const errorRate = new Rate("error_rate");
const productHitDuration = new Trend("product_hit_duration");
const rateLimitedCount = new Counter("rate_limited_count");

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // 평상시
    { duration: "30s", target: 500 },  // 스파이크: 0.5초 만에 500 VU
    { duration: "3m", target: 500 },   // 스파이크 지속
    { duration: "1m", target: 10 },    // 회복
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    // 스파이크 시 Rate Limiting이 정상 동작하는지 확인
    "http_req_duration{endpoint:product_detail}": ["p(95)<5000"],
    http_req_failed: ["rate<0.50"],     // 스파이크 시 50% 실패까지 허용
  },
};

// 핫 상품 ID (라이브 방송 노출 상품)
const HOT_PRODUCT_IDS = [1, 2, 3, 5, 10];

export default function () {
  const headers = {
    "Content-Type": "application/json",
    ...(API_KEY && { Authorization: `Bearer ${API_KEY}` }),
  };

  // 모든 VU가 동일한 핫 상품에 집중 (Flash Sale 시뮬레이션)
  const productId =
    HOT_PRODUCT_IDS[Math.floor(Math.random() * HOT_PRODUCT_IDS.length)];

  const detailRes = http.get(`${BASE_URL}/api/products/${productId}`, {
    headers,
    tags: { endpoint: "product_detail" },
    timeout: "10s",
  });

  productHitDuration.add(detailRes.timings.duration);
  errorRate.add(detailRes.status >= 500);

  // 429 Rate Limited → 정상 동작으로 간주
  if (detailRes.status === 429) {
    rateLimitedCount.add(1);
  }

  check(detailRes, {
    "응답 정상 (2xx, 429 허용)": (r) =>
      (r.status >= 200 && r.status < 300) || r.status === 429,
    "응답 없음 없음 (0 금지)": (r) => r.status !== 0,
  });

  sleep(0.1); // 스파이크 시나리오: 매우 짧은 think time
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const rateLimited = metrics.rate_limited_count?.values?.count || 0;
  const totalReqs = metrics.http_reqs?.values?.count || 1;
  const errorRateVal = metrics.error_rate?.values?.rate || 0;

  const summary = `
╔══════════════════════════════════════════════════╗
║         LiveMart Spike Test 결과                 ║
╠══════════════════════════════════════════════════╣
║  총 요청 수:     ${String(totalReqs).padEnd(10)}                  ║
║  Rate Limited:  ${String(rateLimited).padEnd(10)} (정상 동작)      ║
║  에러율:        ${(errorRateVal * 100).toFixed(2).padEnd(10)}%               ║
║                                                  ║
║  Rate Limiting 정상 동작 여부:                   ║
║    ${rateLimited > 0 ? "✅ Rate Limiting 작동 확인됨" : "⚠️  Rate Limiting 미작동 (확인 필요)"}              ║
╚══════════════════════════════════════════════════╝
  `;

  return {
    "spike-test-result.json": JSON.stringify(data, null, 2),
    stdout: summary,
  };
}
