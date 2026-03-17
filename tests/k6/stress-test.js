/**
 * LiveMart K6 Stress Test
 * 목적: 시스템 한계점(breaking point) 탐색 및 회복 능력 검증
 * 실행: k6 run stress-test.js
 * 소요: ~25분
 *
 * 단계:
 *   Ramp-up → Normal → High Load → Spike → Recovery
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const errorRate = new Rate("error_rate");
const reqDuration = new Trend("req_duration_custom");

export const options = {
  stages: [
    { duration: "2m", target: 20 },   // 워밍업
    { duration: "5m", target: 50 },   // 정상 부하
    { duration: "5m", target: 100 },  // 높은 부하
    { duration: "3m", target: 200 },  // 스트레스
    { duration: "2m", target: 300 },  // 최대 스파이크
    { duration: "5m", target: 50 },   // 회복 (중요: 스파이크 후 복귀)
    { duration: "3m", target: 0 },    // 종료
  ],
  thresholds: {
    // 스트레스 테스트는 느슨한 기준 (한계 탐색이 목적)
    http_req_failed: ["rate<0.30"],          // 실패율 30% 미만
    http_req_duration: ["p(95)<10000"],      // P95 10초 미만
    error_rate: ["rate<0.30"],
  },
};

export default function () {
  const endpoints = [
    { url: `${BASE_URL}/api/products?page=0&size=20`, name: "products" },
    { url: `${BASE_URL}/api/products/search?keyword=상품`, name: "search" },
    { url: `${BASE_URL}/actuator/health`, name: "health" },
  ];

  const target = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(target.url, {
    timeout: "10s",
    tags: { endpoint: target.name },
  });

  reqDuration.add(res.timings.duration, { endpoint: target.name });
  errorRate.add(res.status >= 500 || res.status === 0);

  check(res, {
    [`${target.name}: not 500`]: (r) => r.status < 500,
  });

  sleep(0.3);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const httpFailed = metrics.http_req_failed?.values?.rate || 0;
  const p95 = metrics.http_req_duration?.values?.["p(95)"] || 0;
  const p99 = metrics.http_req_duration?.values?.["p(99)"] || 0;
  const maxVUs = metrics.vus_max?.values?.max || 0;

  const passed = httpFailed < 0.30 && p95 < 10000;

  const summary = `
╔════════════════════════════════════════════════════╗
║         LiveMart Stress Test 결과                  ║
╠════════════════════════════════════════════════════╣
║  최대 VU:         ${String(maxVUs).padEnd(10)}                  ║
║  HTTP 실패율:     ${(httpFailed * 100).toFixed(2).padEnd(10)}%               ║
║  P95 응답시간:    ${p95.toFixed(0).padEnd(10)}ms               ║
║  P99 응답시간:    ${p99.toFixed(0).padEnd(10)}ms               ║
║  최종 판정:       ${passed ? "✅ PASS" : "❌ FAIL"}                        ║
╚════════════════════════════════════════════════════╝
  `;

  return {
    "stress-test-result.json": JSON.stringify(data, null, 2),
    stdout: summary,
  };
}
