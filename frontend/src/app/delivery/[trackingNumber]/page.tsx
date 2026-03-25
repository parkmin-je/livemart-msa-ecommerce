'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';

interface DeliveryEvent {
  time: string;
  status: string;
  location: string;
  description: string;
}

interface DeliveryInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  events?: DeliveryEvent[];
  recipientName?: string;
  shippingAddress?: string;
}

const STATUS_ICON: Record<string, string> = {
  PICKED_UP: '○', IN_TRANSIT: '→', OUT_FOR_DELIVERY: '↗', DELIVERED: '✓',
};

export default function DeliveryPage() {
  const { trackingNumber } = useParams();
  const router = useRouter();
  const [info, setInfo] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/delivery/${trackingNumber}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setInfo(d))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [trackingNumber]);

  const demoEvents: DeliveryEvent[] = info?.events || [
    { time: new Date(Date.now() - 3600000 * 24).toISOString(), status: 'PICKED_UP', location: '서울 강남 허브', description: '물품이 발송되었습니다' },
    { time: new Date(Date.now() - 3600000 * 12).toISOString(), status: 'IN_TRANSIT', location: '대전 허브', description: '물품이 이동중입니다' },
    { time: new Date(Date.now() - 3600000 * 2).toISOString(), status: 'OUT_FOR_DELIVERY', location: '배달 출발', description: '배달이 시작되었습니다' },
  ];

  return (
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="text-sm mb-4 flex items-center gap-1 transition-colors"
          style={{ color: 'rgba(14,14,14,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#E8001D')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.45)')}
        >
          ← 뒤로가기
        </button>
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#0E0E0E' }}>배송 조회</h1>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }} />
            <div className="h-48 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 배송 헤더 */}
            <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.4)' }}>운송장 번호</p>
                  <p className="font-bold text-lg font-mono" style={{ color: '#0E0E0E' }}>{trackingNumber}</p>
                </div>
                <span className="text-white text-sm font-bold px-4 py-2" style={{ background: '#E8001D' }}>
                  {info?.status === 'DELIVERED' ? '배송완료' : '배송중'}
                </span>
              </div>
              {info?.carrier && <p className="text-sm" style={{ color: 'rgba(14,14,14,0.55)' }}>택배사: {info.carrier}</p>}
              {info?.estimatedDelivery && (
                <div className="mt-3 p-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: 'rgb(37,99,235)' }}>
                    예상 배송일: {new Date(info.estimatedDelivery).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                </div>
              )}
              {info?.recipientName && (
                <div className="mt-3 pt-3 text-sm" style={{ borderTop: '1px solid rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.6)' }}>
                  <span className="font-medium">{info.recipientName}</span> · {info.shippingAddress}
                </div>
              )}
            </div>

            {/* 배송 타임라인 */}
            <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <h2 className="font-bold mb-5" style={{ color: '#0E0E0E' }}>배송 현황</h2>
              {demoEvents.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'rgba(14,14,14,0.4)' }}>배송 정보가 없습니다</p>
              ) : (
                <div className="space-y-0">
                  {[...demoEvents].reverse().map((ev, i) => (
                    <div key={i} className="flex gap-4 relative">
                      {i < demoEvents.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-0.5" style={{ background: 'rgba(14,14,14,0.08)' }} />
                      )}
                      <div
                        className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm z-10"
                        style={{
                          background: i === 0 ? 'rgba(232,0,29,0.1)' : 'rgba(14,14,14,0.06)',
                          color: i === 0 ? '#E8001D' : 'rgba(14,14,14,0.5)',
                        }}
                      >
                        {STATUS_ICON[ev.status] || '·'}
                      </div>
                      <div className="flex-1 pb-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: i === 0 ? '#E8001D' : 'rgba(14,14,14,0.7)' }}>{ev.description}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(14,14,14,0.4)' }}>{ev.location}</p>
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: 'rgba(14,14,14,0.4)' }}>
                            {new Date(ev.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}{' '}
                            {new Date(ev.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 고객센터 */}
            <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#0E0E0E' }}>배송 문의</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 py-3 text-sm transition-colors"
                  style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.65)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  택배사 문의
                </button>
                <button
                  className="flex items-center justify-center gap-2 py-3 text-sm transition-colors"
                  style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.65)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  LiveMart 고객센터
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
