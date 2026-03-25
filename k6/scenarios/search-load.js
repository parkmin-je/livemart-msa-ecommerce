/**
 * K6 Elasticsearch/OpenSearch 검색 부하 테스트
 *
 * 목적: 전문 검색(Full-text), 자동완성, 집계 쿼리 성능 검증
 * 시나리오: 동시 검색 부하 증가 테스트
 * 임계값: 검색 p(95) < 500ms, 자동완성 p(95) < 200ms
 *
 * 실행:
 *   k6 run k6/scenarios/search-load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── 커스텀 메트릭 ─────────────────────────────────────────
const searchDuration = new Trend('search_full_text_duration', true);
const autocompleteDuration = new Trend('autocomplete_duration', true);
const aggregationDuration = new Trend('aggregation_duration', true);
const searchErrorRate = new Rate('search_errors');
const zeroResultCount = new Counter('search_zero_results');
const totalSearchCount = new Counter('total_searches');

// ── 테스트 설정 ───────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp-up
    { duration: '2m', target: 200 },   // 정상 부하
    { duration: '1m', target: 500 },   // 고부하
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    search_errors: ['rate<0.01'],
    search_full_text_duration: ['p(95)<500', 'p(99)<1000'],
    autocomplete_duration: ['p(95)<200', 'p(99)<500'],
    aggregation_duration: ['p(95)<1000'],
  },
};

// ── 검색 시나리오 데이터 ───────────────────────────────────
const SEARCH_QUERIES = [
  '삼성 갤럭시', '애플 아이폰', '나이키 운동화', '아디다스',
  '립스틱', '파운데이션', '텀블러', '노트북', '무선 이어폰',
  '게이밍 마우스', '기계식 키보드', '모니터', '웹캠', '마이크',
  '요가 매트', '덤벨', '러닝화', '등산화', '패딩', '코트',
];

const AUTOCOMPLETE_PREFIXES = [
  '삼', '애', '나이', '아디', '립', '텀블', '노트',
  '무선', '게이밍', '기계', '요가', '러닝', '패딩',
];

const CATEGORIES = ['electronics', 'fashion', 'food', 'beauty', 'sports', 'home'];
const PRICE_RANGES = [
  { min: 0, max: 50000 },
  { min: 50000, max: 200000 },
  { min: 200000, max: 1000000 },
];

const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

// ── 전문 검색 ──────────────────────────────────────────────
function performFullTextSearch() {
  const query = SEARCH_QUERIES[randomIntBetween(0, SEARCH_QUERIES.length - 1)];
  const page = randomIntBetween(0, 5);
  const size = [10, 20, 40][randomIntBetween(0, 2)];

  const res = http.get(
    `${BASE_URL}/api/products/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`,
    { headers, tags: { name: 'full_text_search' }, timeout: '5s' }
  );

  searchDuration.add(res.timings.duration);
  totalSearchCount.add(1);

  const success = check(res, {
    '검색 성공 (200)': (r) => r.status === 200,
  });

  if (!success) {
    searchErrorRate.add(1);
    return;
  }

  // 결과 없음 추적
  try {
    const data = res.json();
    const results = data.content || data.products || data.data || [];
    const total = data.totalElements || data.total || results.length;
    if (total === 0) {
      zeroResultCount.add(1);
    }
  } catch (_) {}
}

// ── 자동완성 검색 ─────────────────────────────────────────
function performAutocomplete() {
  const prefix = AUTOCOMPLETE_PREFIXES[randomIntBetween(0, AUTOCOMPLETE_PREFIXES.length - 1)];

  const res = http.get(
    `${BASE_URL}/api/products/search/autocomplete?q=${encodeURIComponent(prefix)}&size=5`,
    { headers, tags: { name: 'autocomplete' }, timeout: '2s' }
  );

  autocompleteDuration.add(res.timings.duration);

  const success = check(res, {
    '자동완성 성공 (200)': (r) => r.status === 200,
    '자동완성 응답 빠름': (r) => r.timings.duration < 200,
  });

  if (!success) searchErrorRate.add(1);
}

// ── 필터 + 집계 검색 ──────────────────────────────────────
function performFilteredSearch() {
  const category = CATEGORIES[randomIntBetween(0, CATEGORIES.length - 1)];
  const priceRange = PRICE_RANGES[randomIntBetween(0, PRICE_RANGES.length - 1)];
  const sortOptions = ['price_asc', 'price_desc', 'newest', 'popular'];
  const sort = sortOptions[randomIntBetween(0, sortOptions.length - 1)];

  const params = new URLSearchParams({
    category,
    minPrice: priceRange.min.toString(),
    maxPrice: priceRange.max.toString(),
    sort,
    page: '0',
    size: '20',
  });

  const res = http.get(
    `${BASE_URL}/api/products?${params.toString()}`,
    { headers, tags: { name: 'filtered_search' }, timeout: '5s' }
  );

  aggregationDuration.add(res.timings.duration);

  check(res, {
    '필터 검색 성공 (200)': (r) => r.status === 200,
  });
}

// ── AI 검색 (의도 분석) ───────────────────────────────────
function performAISearch() {
  const query = SEARCH_QUERIES[randomIntBetween(0, SEARCH_QUERIES.length - 1)];

  const res = http.post(
    `${BASE_URL}/api/ai/search/intent`,
    JSON.stringify({ query }),
    { headers, tags: { name: 'ai_search' }, timeout: '5s' }
  );

  check(res, {
    'AI 검색 가능 (200/404)': (r) => r.status === 200 || r.status === 404,
  });
}

// ── 메인 시나리오 ─────────────────────────────────────────
export default function () {
  // 행동 가중치: 전문검색(50%) > 자동완성(30%) > 필터검색(15%) > AI검색(5%)
  const rand = Math.random();

  if (rand < 0.5) {
    group('전문 검색', performFullTextSearch);
    sleep(randomIntBetween(1, 3));

    // 검색 후 자동완성 사용 (실제 패턴)
    if (Math.random() < 0.4) {
      group('자동완성', performAutocomplete);
      sleep(0.5);
    }

  } else if (rand < 0.8) {
    group('자동완성', performAutocomplete);
    sleep(0.5);

    // 자동완성 후 전체 검색
    group('전문 검색', performFullTextSearch);
    sleep(randomIntBetween(1, 2));

  } else if (rand < 0.95) {
    group('필터 검색', performFilteredSearch);
    sleep(randomIntBetween(2, 4));

  } else {
    group('AI 검색', performAISearch);
    sleep(randomIntBetween(1, 3));
  }

  sleep(randomIntBetween(1, 3));
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const summary = [
    '\n=== 검색 부하 테스트 결과 ===',
    `총 검색: ${metrics.total_searches?.values?.count || 0}`,
    `빈 결과 수: ${metrics.search_zero_results?.values?.count || 0}`,
    `검색 에러율: ${((metrics.search_errors?.values?.rate || 0) * 100).toFixed(2)}%`,
    `전문 검색 P95: ${(metrics.search_full_text_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    `자동완성 P95: ${(metrics.autocomplete_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    `집계 검색 P95: ${(metrics.aggregation_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    '============================\n',
  ];

  return {
    stdout: summary.join('\n'),
    'k6/results/search-load-summary.json': JSON.stringify(data, null, 2),
  };
}
