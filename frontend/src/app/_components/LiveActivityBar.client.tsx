'use client';

import { useState, useEffect, useRef } from 'react';

interface DashboardMetrics {
  activeUsers?: number;
  minuteSales?: number;
  dailyOrders?: number;
  revenue?: number;
  topProducts?: Array<{ name: string; sales: number }>;
}

export function LiveActivityBar() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLive, setIsLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    setMetrics({ activeUsers: 0, dailyOrders: 0, revenue: 0 });

    const connect = () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (esRef.current) esRef.current.close();

      const es = new EventSource('/api/dashboard/stream', { withCredentials: true });
      esRef.current = es;

      es.onopen = () => { setIsLive(true); retryCount.current = 0; };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && typeof data === 'object' && Object.keys(data).length > 0) setMetrics(data);
        } catch {}
      };

      es.addEventListener('metrics', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          if (data) setMetrics(data);
        } catch {}
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setIsLive(false);
        if (retryCount.current < 3) {
          retryCount.current++;
          retryRef.current = setTimeout(connect, 5000 * retryCount.current);
        }
      };
    };

    const fetchMetrics = () => {
      fetch('/api/dashboard/metrics', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && typeof d === 'object') setMetrics(prev => ({ ...prev, ...d })); })
        .catch(() => {});
    };

    connect();
    fetchMetrics();
    const pollId = setInterval(fetchMetrics, 30000);

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (esRef.current) esRef.current.close();
      clearInterval(pollId);
    };
  }, []);

  const activeUsers = metrics?.activeUsers ?? 0;
  const dailyOrders = metrics?.dailyOrders ?? 0;
  const revenue = metrics?.revenue ?? 0;

  return (
    <div
      className="w-full"
      style={{ background: '#F7F6F2', borderTop: '1px solid rgba(14,14,14,0.06)', borderBottom: '1px solid rgba(14,14,14,0.06)' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between py-3 gap-4 overflow-x-auto no-scrollbar">
          {/* LIVE 인디케이터 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="relative flex items-center justify-center w-2 h-2">
              <span
                className="relative z-10 w-2 h-2 rounded-full"
                style={{ background: isLive ? '#E8001D' : 'rgba(14,14,14,0.2)' }}
              />
              {isLive && (
                <span className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: '#E8001D' }}>LIVE</span>
          </div>

          {/* 구분선 */}
          <div className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(14,14,14,0.12)' }} />

          {/* 지표들 */}
          <div className="flex items-center gap-6 flex-1 justify-center flex-wrap">
            {/* 현재 접속자 */}
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              <span className="text-[11px]" style={{ color: 'rgba(14,14,14,0.4)' }}>현재 접속</span>
              <span className="text-[12px] font-black tabular-nums" style={{ color: '#0E0E0E' }}>
                {activeUsers.toLocaleString()}명
              </span>
            </div>

            <div className="w-px h-3.5 flex-shrink-0" style={{ background: 'rgba(14,14,14,0.08)' }} />

            {/* 오늘 주문 */}
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <span className="text-[11px]" style={{ color: 'rgba(14,14,14,0.4)' }}>오늘 주문</span>
              <span className="text-[12px] font-black tabular-nums" style={{ color: '#0E0E0E' }}>
                {dailyOrders.toLocaleString()}건
              </span>
            </div>

            <div className="w-px h-3.5 flex-shrink-0" style={{ background: 'rgba(14,14,14,0.08)' }} />

            {/* 오늘 매출 */}
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-[11px]" style={{ color: 'rgba(14,14,14,0.4)' }}>오늘 매출</span>
              <span className="text-[12px] font-black tabular-nums" style={{ color: '#E8001D' }}>
                ₩{revenue >= 1000000
                  ? `${(revenue / 1000000).toFixed(1)}M`
                  : revenue >= 10000
                    ? `${Math.floor(revenue / 10000)}만`
                    : revenue.toLocaleString()}
              </span>
            </div>

            {/* 인기상품 (있을 때만) */}
            {metrics?.topProducts && metrics.topProducts[0] && (
              <>
                <div className="w-px h-3.5 flex-shrink-0 hidden sm:block" style={{ background: 'rgba(14,14,14,0.08)' }} />
                <div className="items-center gap-2 hidden sm:flex">
                  <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span className="text-[11px]" style={{ color: 'rgba(14,14,14,0.4)' }}>인기</span>
                  <span className="text-[11px] font-semibold max-w-[120px] truncate" style={{ color: 'rgba(14,14,14,0.7)' }}>
                    {metrics.topProducts[0].name}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 업데이트 시간 표시 */}
          <div className="flex-shrink-0">
            <span className="text-[10px]" style={{ color: 'rgba(14,14,14,0.3)' }}>실시간 업데이트</span>
          </div>
        </div>
      </div>
    </div>
  );
}
