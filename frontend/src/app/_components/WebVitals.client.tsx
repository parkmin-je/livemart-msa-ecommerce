'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Core Web Vitals 수집 → 백엔드 analytics 전송
 *
 * 측정 지표:
 *  - LCP  (Largest Contentful Paint)  — 로딩 성능, 목표 < 2.5s
 *  - FID  (First Input Delay)         — 인터랙티비티, 목표 < 100ms
 *  - CLS  (Cumulative Layout Shift)   — 시각적 안정성, 목표 < 0.1
 *  - FCP  (First Contentful Paint)    — 첫 콘텐츠 렌더, 목표 < 1.8s
 *  - TTFB (Time To First Byte)        — 서버 응답, 목표 < 800ms
 *  - INP  (Interaction to Next Paint) — 응답성, 목표 < 200ms
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // 개발 환경: 콘솔 출력
    if (process.env.NODE_ENV === 'development') {
      const rating = getMetricRating(metric.name, metric.value);
      console.log(
        `[WebVitals] ${metric.name}: ${metric.value.toFixed(1)} — ${rating}`,
      );
    }

    // 프로덕션: analytics 서비스로 전송 (비동기, 실패 무시)
    if (process.env.NODE_ENV === 'production') {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,       // 'good' | 'needs-improvement' | 'poor'
        id: metric.id,
        delta: metric.delta,
        navigationType: metric.navigationType,
        page: window.location.pathname,
        userAgent: navigator.userAgent.slice(0, 150),
        timestamp: Date.now(),
      });

      // navigator.sendBeacon 우선 (페이지 언로드 시 보장)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/web-vitals', body);
      } else {
        fetch('/api/analytics/web-vitals', {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => undefined);
      }
    }
  });

  return null;
}

function getMetricRating(name: string, value: number): string {
  const thresholds: Record<string, [number, number]> = {
    LCP:  [2500, 4000],
    FID:  [100, 300],
    CLS:  [0.1, 0.25],
    FCP:  [1800, 3000],
    TTFB: [800, 1800],
    INP:  [200, 500],
  };
  const t = thresholds[name];
  if (!t) return 'unknown';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}
