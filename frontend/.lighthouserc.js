/** @type {import('@lhci/cli').LighthouseRcConfig} */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node .next/standalone/server.js',
      startServerReadyPattern: 'started server on',
      startServerReadyTimeout: 30000,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products',
        'http://localhost:3000/health',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        // 실제 네트워크 시뮬레이션 (4G)
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        skipAudits: [
          'uses-http2',       // 로컬 환경 HTTP/1.1
          'canonical',        // 로컬 URL 미적용
        ],
      },
    },
    assert: {
      assertions: {
        // Lighthouse 점수 최저 기준 (CI 통과 조건)
        'categories:performance':     ['warn',  { minScore: 0.8 }],
        'categories:accessibility':   ['error', { minScore: 0.9 }],
        'categories:best-practices':  ['warn',  { minScore: 0.9 }],
        'categories:seo':             ['warn',  { minScore: 0.9 }],

        // Core Web Vitals 기준
        'first-contentful-paint':     ['warn',  { maxNumericValue: 2000 }],
        'largest-contentful-paint':   ['warn',  { maxNumericValue: 2500 }],
        'total-blocking-time':        ['warn',  { maxNumericValue: 300 }],
        'cumulative-layout-shift':    ['warn',  { maxNumericValue: 0.1 }],
        'speed-index':                ['warn',  { maxNumericValue: 3000 }],

        // 번들 크기
        'uses-optimized-images':      ['warn',  {}],
        'uses-text-compression':      ['warn',  {}],
        'render-blocking-resources':  ['warn',  {}],
        'unused-javascript':          ['warn',  { maxLength: 0 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
