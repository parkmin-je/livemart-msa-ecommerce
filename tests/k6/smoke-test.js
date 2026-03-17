/**
 * LiveMart K6 Smoke Test
 * 목적: 배포 후 핵심 기능 동작 여부 빠르게 검증
 * 실행: k6 run smoke-test.js
 * 소요: ~2분
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ── 커스텀 메트릭 ──────────────────────────────────────────
const httpDuration = new Trend("http_req_duration_custom");
const errorRate = new Rate("error_rate");
const requestCount = new Counter("request_count");

// ── 설정 ───────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const API_KEY = __ENV.API_KEY || "";

export const options = {
  vus: 3,           // 가상 사용자 3명
  duration: "1m",   // 1분간 실행
  thresholds: {
    // 스모크 테스트는 매우 엄격한 기준
    http_req_failed: ["rate<0.01"],          // 실패율 1% 미만
    http_req_duration: ["p(95)<2000"],       // P95 2초 미만
    error_rate: ["rate<0.01"],
  },
};

// ── 공통 헤더 ──────────────────────────────────────────────
const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  ...(API_KEY && { Authorization: `Bearer ${API_KEY}` }),
};

// ── 테스트 시나리오 ────────────────────────────────────────
export default function () {
  // 1. 헬스체크
  const healthRes = http.get(`${BASE_URL}/actuator/health`, { headers });
  check(healthRes, {
    "health: status 200": (r) => r.status === 200,
    "health: status UP": (r) => {
      try {
        return JSON.parse(r.body).status === "UP";
      } catch {
        return false;
      }
    },
  });
  httpDuration.add(healthRes.timings.duration, { endpoint: "health" });
  errorRate.add(healthRes.status !== 200);
  requestCount.add(1);

  sleep(0.5);

  // 2. 상품 목록 조회
  const productsRes = http.get(`${BASE_URL}/api/products?page=0&size=10`, {
    headers,
  });
  check(productsRes, {
    "products: status 200": (r) => r.status === 200,
    "products: has content": (r) => r.body && r.body.length > 10,
    "products: response time < 1s": (r) => r.timings.duration < 1000,
  });
  httpDuration.add(productsRes.timings.duration, { endpoint: "products" });
  errorRate.add(productsRes.status >= 500);
  requestCount.add(1);

  sleep(0.5);

  // 3. 상품 검색
  const searchRes = http.get(
    `${BASE_URL}/api/products/search?keyword=테스트&page=0&size=5`,
    { headers }
  );
  check(searchRes, {
    "search: status 200": (r) => r.status === 200,
  });
  httpDuration.add(searchRes.timings.duration, { endpoint: "search" });
  errorRate.add(searchRes.status >= 500);
  requestCount.add(1);

  sleep(1);
}

// ── 테스트 종료 요약 ───────────────────────────────────────
export function handleSummary(data) {
  return {
    "smoke-test-result.json": JSON.stringify(data, null, 2),
    stdout: buildSummary(data),
  };
}

function buildSummary(data) {
  const metrics = data.metrics;
  const errRate = metrics.error_rate
    ? (metrics.error_rate.values.rate * 100).toFixed(2)
    : "N/A";
  const p95 = metrics.http_req_duration
    ? metrics.http_req_duration.values["p(95)"].toFixed(0)
    : "N/A";
  const p99 = metrics.http_req_duration
    ? metrics.http_req_duration.values["p(99)"].toFixed(0)
    : "N/A";

  return `
╔══════════════════════════════════════════════╗
║        LiveMart Smoke Test 결과              ║
╠══════════════════════════════════════════════╣
║  에러율:     ${errRate.padEnd(10)}%                 ║
║  P95 응답:   ${p95.padEnd(10)}ms                ║
║  P99 응답:   ${p99.padEnd(10)}ms                ║
╚══════════════════════════════════════════════╝
`;
}
