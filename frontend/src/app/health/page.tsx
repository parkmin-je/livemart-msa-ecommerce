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
    UP:       { dotStyle: { background: '#10B981' }, style: { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgb(4,120,87)' }, dotClass: 'animate-pulse', label: 'UP' },
    DOWN:     { dotStyle: { background: '#E8001D' }, style: { background: 'rgba(232,0,29,0.06)', border: '1px solid rgba(232,0,29,0.2)', color: '#C8001A' }, dotClass: '', label: 'DOWN' },
    CHECKING: { dotStyle: { background: 'rgba(14,14,14,0.25)' }, style: { background: 'rgba(14,14,14,0.04)', border: '1px solid rgba(14,14,14,0.1)', color: 'rgba(14,14,14,0.5)' }, dotClass: 'animate-pulse', label: '확인 중' },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold" style={cfg.style}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} style={cfg.dotStyle} />
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
    <main className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <div className="px-4 sm:px-6 py-4" style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: '#0E0E0E' }}>시스템 상태 대시보드</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(14,14,14,0.4)' }}>
              {lastChecked ? `마지막 확인: ${lastChecked.toLocaleTimeString('ko-KR')}` : '확인 중...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm transition-colors" style={{ color: 'rgba(14,14,14,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.5)')}>← 홈</a>
            <button
              onClick={checkHealth}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: '#0A0A0A' }}
              onMouseEnter={e => !checking && (e.currentTarget.style.background = '#E8001D')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
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
            { label: '정상', value: upCount, color: upCount > 0 ? 'rgb(4,120,87)' : '#0E0E0E' },
            { label: '장애', value: downCount, color: downCount > 0 ? '#E8001D' : '#0E0E0E' },
            { label: '전체', value: SERVICES.length, color: '#0E0E0E' },
            { label: '가용률', value: `${Math.round((upCount / SERVICES.length) * 100)}%`, color: allUp ? 'rgb(4,120,87)' : '#E8001D' },
          ].map(card => (
            <div key={card.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Status Banner */}
        <div className="flex items-center gap-3 px-4 py-3 mb-6" style={
          allUp
            ? { background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }
            : downCount > 0
              ? { background: 'rgba(232,0,29,0.06)', border: '1px solid rgba(232,0,29,0.18)' }
              : { background: 'rgba(14,14,14,0.04)', border: '1px solid rgba(14,14,14,0.1)' }
        }>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${allUp ? 'animate-pulse' : ''}`}
            style={{ background: allUp ? '#10B981' : downCount > 0 ? '#E8001D' : 'rgba(14,14,14,0.35)' }} />
          <p className="text-sm font-semibold" style={{ color: allUp ? 'rgb(4,120,87)' : downCount > 0 ? '#C8001A' : 'rgba(14,14,14,0.7)' }}>
            {allUp ? '모든 시스템이 정상 운영 중입니다' : downCount > 0 ? `${downCount}개 서비스에 문제가 있습니다` : '서비스 상태를 확인 중입니다'}
          </p>
        </div>

        {/* Services */}
        <div className="overflow-hidden mb-6" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)', background: '#F7F6F1' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(14,14,14,0.5)' }}>마이크로서비스</h2>
          </div>
          <div>
            {services.map(svc => (
              <div key={svc.name} className="flex items-center justify-between px-4 py-3.5 transition-colors"
                style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div className="min-w-0 mr-4">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0E0E0E' }}>{svc.displayName}</p>
                  <p className="text-xs font-mono truncate" style={{ color: 'rgba(14,14,14,0.4)' }}>{svc.name}</p>
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
            <div key={infra.name} className="px-4 py-3.5 flex items-center justify-between" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0E0E0E' }}>{infra.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(14,14,14,0.4)' }}>{infra.desc}</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 ml-3" />
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'rgba(14,14,14,0.4)' }}>LiveMart MSA · Kubernetes · Spring Boot 3.x · {new Date().getFullYear()}</p>
      </div>
    </main>
  );
}
