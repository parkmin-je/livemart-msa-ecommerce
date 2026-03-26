/**
 * K6 상품 API 부하 테스트
 *
 * 목적: 상품 목록/상세 조회 API의 고부하 내성 검증
 * 시나리오: 점진적 VU 증가 100 → 500 (5분)
 * 임계값: p(95) < 2s, p(99) < 5s, 에러율 < 1%
 *
 * 실행:
 *   k6 run k6/scenarios/product-load.js
 *   k6 run --env BASE_URL=https://api.livemart.io k6/scenarios/product-load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── 커스텀 메트릭 ─────────────────────────────────────────
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration', true);
const productListDuration = new Trend('product_list_duration', true);
const productDetailDuration = new Trend('product_detail_duration', true);
const searchDuration = new Trend('search_duration', true);
const cacheHitRate = new Rate('cache_hits');
const successCount = new Counter('success_requests');

// ── 테스트 설정 ───────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up: 0→100 VU
    { duration: '2m', target: 300 },  // 증가: 100→300 VU
    { duration: '1m', target: 500 },  // 피크: 300→500 VU
    { duration: '1m', target: 0 },    // Ramp-down: 500→0 VU
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
    product_list_duration: ['p(95)<1500'],
    product_detail_duration: ['p(95)<1000'],
    search_duration: ['p(95)<2000'],
  },
};

// ── 테스트 데이터 ─────────────────────────────────────────
const CATEGORIES = ['electronics', 'fashion', 'food', 'beauty', 'sports', 'home'];
const SORT_OPTIONS = ['price_asc', 'price_desc', 'newest', 'popular'];
const SEARCH_QUERIES = ['노트북', '스마트폰', '운동화', '립스틱', '텀블러', '에어팟'];

// ── 유틸리티 ──────────────────────────────────────────────
function randomCategory() {
  return CATEGORIES[randomIntBetween(0, CATEGORIES.length - 1)];
}

function randomSort() {
  return SORT_OPTIONS[randomIntBetween(0, SORT_OPTIONS.length - 1)];
}

function randomSearchQuery() {
  return SEARCH_QUERIES[randomIntBetween(0, SEARCH_QUERIES.length - 1)];
}

function checkResponse(res, label) {
  const success = check(res, {
    [`${label}: status 200`]: (r) => r.status === 200,
    [`${label}: body not empty`]: (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!success);
  if (success) successCount.add(1);

  // Cache 히트 여부 (X-Cache 헤더 기반)
  const cacheHeader = res.headers['X-Cache'] || res.headers['x-cache'] || '';
  cacheHitRate.add(cacheHeader.includes('HIT'));

  return success;
}

// ── 메인 시나리오 ─────────────────────────────────────────
export default function () {
  const params = {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: '30s',
  };

  // 시나리오 1: 상품 목록 조회 (가장 빈번한 요청)
  group('상품 목록 조회', function () {
    const page = randomIntBetween(0, 10);
    const category = randomCategory();
    const sort = randomSort();

    const url = `${BASE_URL}/api/products?page=${page}&size=20&category=${category}&sort=${sort}`;
    const res = http.get(url, { ...params, tags: { name: 'product_list' } });

    productListDuration.add(res.timings.duration);
    requestDuration.add(res.timings.duration);
    checkResponse(res, '상품목록');

    // 응답에서 랜덤 상품 ID 추출 후 상세 조회
    if (res.status === 200) {
      try {
        const data = res.json();
        const products = data.content || data.products || data.data || [];
        if (products.length > 0) {
          const product = products[randomIntBetween(0, products.length - 1)];
          const productId = product.id || product.productId;

          if (productId) {
            sleep(0.5); // 사용자 클릭 지연

            group('상품 상세 조회', function () {
              const detailRes = http.get(
                `${BASE_URL}/api/products/${productId}`,
                { ...params, tags: { name: 'product_detail' } }
              );
              productDetailDuration.add(detailRes.timings.duration);
              requestDuration.add(detailRes.timings.duration);
              checkResponse(detailRes, '상품상세');
            });
          }
        }
      } catch (_) {
        // JSON 파싱 실패 시 무시
      }
    }
  });

  sleep(randomIntBetween(1, 3));

  // 시나리오 2: 카테고리 필터링 (30% 확률)
  if (Math.random() < 0.3) {
    group('카테고리 필터', function () {
      const res = http.get(
        `${BASE_URL}/api/products?category=${randomCategory()}&page=0&size=12`,
        { ...params, tags: { name: 'product_category' } }
      );
      requestDuration.add(res.timings.duration);
      checkResponse(res, '카테고리필터');
    });

    sleep(randomIntBetween(1, 2));
  }

  // 시나리오 3: 검색 (20% 확률)
  if (Math.random() < 0.2) {
    group('상품 검색', function () {
      const query = randomSearchQuery();
      const res = http.get(
        `${BASE_URL}/api/products/search?q=${encodeURIComponent(query)}&page=0&size=20`,
        { ...params, tags: { name: 'product_search' } }
      );
      searchDuration.add(res.timings.duration);
      requestDuration.add(res.timings.duration);
      checkResponse(res, '검색');
    });

    sleep(randomIntBetween(1, 2));
  }

  // 시나리오 4: 플래시 세일 상품 조회 (10% 확률)
  if (Math.random() < 0.1) {
    group('플래시 세일 조회', function () {
      const res = http.get(
        `${BASE_URL}/api/products/flash-sale`,
        { ...params, tags: { name: 'flash_sale' } }
      );
      requestDuration.add(res.timings.duration);
      checkResponse(res, '플래시세일');
    });
  }

  sleep(randomIntBetween(2, 5));
}

// ── 테스트 시작 시 요약 출력 ──────────────────────────────
export function handleSummary(data) {
  return {
    stdout: formatSummary(data),
    'k6/results/product-load-summary.json': JSON.stringify(data, null, 2),
  };
}

function formatSummary(data) {
  const metrics = data.metrics;
  const lines = [
    '\n=== 상품 API 부하 테스트 결과 ===',
    `총 요청: ${metrics.http_reqs?.values?.count || 0}`,
    `실패율: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`,
    `P95 응답시간: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    `P99 응답시간: ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(0)}ms`,
    `캐시 히트율: ${((metrics.cache_hits?.values?.rate || 0) * 100).toFixed(1)}%`,
    '=================================\n',
  ];
  return lines.join('\n');
}
