'use client';

import { useState, useEffect, useCallback } from 'react';

interface ServiceHealth {
  name: string;
  displayName: string;
  apiPath: string;
  status: 'UP' | 'DOWN' | 'CHECKING';
  latency?: number;
}

const SERVICES: Omit<ServiceHealth, 'status'>[] = [
  { name: 'api-gateway',          displayName: 'API Gateway',          apiPath: '/api/gateway/actuator/health' },
  { name: 'user-service',         displayName: 'User Service',         apiPath: '/api/users/actuator/health' },
  { name: 'product-service',      displayName: 'Product Service',      apiPath: '/api/products/actuator/health' },
  { name: 'order-service',        displayName: 'Order Service',        apiPath: '/api/orders/actuator/health' },
  { name: 'payment-service',      displayName: 'Payment Service',      apiPath: '/api/payments/actuator/health' },
  { name: 'notification-service', displayName: 'Notification Service', apiPath: '/api/notifications/actuator/health' },
  { name: 'ai-service',           displayName: 'AI Service',           apiPath: '/api/ai/actuator/health' },
  { name: 'analytics-service',    displayName: 'Analytics Service',    apiPath: '/api/analytics/actuator/health' },
];

function StatusBadge({ status }: { status: ServiceHealth['status'] }) {
  const cfg = {
    UP:       { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'UP' },
    DOWN:     { dot: 'bg-red-500',                   text: 'text-red-700',     bg: 'bg-red-50 border-red-200',         label: 'DOWN' },
    CHECKING: { dot: 'bg-gray-300 animate-pulse',    text: 'text-gray-500',    bg: 'bg-gray-50 border-gray-200',       label: '확인 중' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceHealth[]>(
    SERVICES.map(s => ({ ...s, status: 'CHECKING' }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setServices(SERVICES.map(s => ({ ...s, status: 'CHECKING' })));
    const updated = await Promise.all(
      SERVICES.map(async (svc) => {
        const start = Date.now();
        try {
          const res = await fetch(svc.apiPath, {
            signal: AbortSignal.timeout(5000),
            credentials: 'include',
          });
          const latency = Date.now() - start;
          return { ...svc, status: res.ok ? 'UP' as const : 'DOWN' as const, latency };
        } catch {
          return { ...svc, status: 'DOWN' as const, latency: Date.now() - start };
        }
      })
    );
    setServices(updated);
    setLastChecked(new Date());
    setChecking(false);
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const upCount = services.filter(s => s.status === 'UP').length;
  const downCount = services.filter(s => s.status === 'DOWN').length;
  const allUp = upCount === SERVICES.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">시스템 상태 대시보드</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {lastChecked ? `마지막 확인: ${lastChecked.toLocaleTimeString('ko-KR')}` : '확인 중...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← 홈</a>
            <button
              onClick={checkHealth}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {checking ? '확인 중...' : '새로고침'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: '정상', value: upCount, color: upCount > 0 ? 'text-emerald-600' : 'text-gray-900' },
            { label: '장애', value: downCount, color: downCount > 0 ? 'text-red-600' : 'text-gray-900' },
            { label: '전체', value: SERVICES.length, color: 'text-gray-900' },
            { label: '가용률', value: `${Math.round((upCount / SERVICES.length) * 100)}%`, color: allUp ? 'text-emerald-600' : 'text-red-600' },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Status Banner */}
        <div className={`flex items-center gap-3 px-4 py-3 border rounded-lg mb-6 ${
          allUp ? 'bg-emerald-50 border-emerald-200' : downCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${allUp ? 'bg-emerald-500 animate-pulse' : downCount > 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
          <p className={`text-sm font-semibold ${allUp ? 'text-emerald-800' : downCount > 0 ? 'text-red-800' : 'text-gray-700'}`}>
            {allUp ? '모든 시스템이 정상 운영 중입니다' : downCount > 0 ? `${downCount}개 서비스에 문제가 있습니다` : '서비스 상태를 확인 중입니다'}
          </p>
        </div>

        {/* Services */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">마이크로서비스</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {services.map(svc => (
              <div key={svc.name} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="min-w-0 mr-4">
                  <p className="text-sm font-semibold text-gray-900 truncate">{svc.displayName}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{svc.name}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {svc.latency !== undefined && svc.status === 'UP' && (
                    <span className={`text-xs font-mono hidden sm:block ${
                      svc.latency < 300 ? 'text-emerald-600' : svc.latency < 1000 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {svc.latency}ms
                    </span>
                  )}
                  <StatusBadge status={svc.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Apache Kafka', desc: '이벤트 스트리밍 · Saga 패턴' },
            { name: 'Redis',        desc: '캐시 · 세션 · Rate Limiting' },
            { name: 'Elasticsearch', desc: '상품 검색 · 자동완성' },
          ].map(infra => (
            <div key={infra.name} className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{infra.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{infra.desc}</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 ml-3" />
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">LiveMart MSA · Kubernetes · Spring Boot 3.x · {new Date().getFullYear()}</p>
      </div>
    </main>
  );
}
