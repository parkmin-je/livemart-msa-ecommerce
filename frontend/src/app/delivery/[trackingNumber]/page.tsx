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

const STATUS_EMOJI: Record<string, string> = {
  PICKED_UP: '📦', IN_TRANSIT: '🚚', OUT_FOR_DELIVERY: '🛵', DELIVERED: '🎉',
};

export default function DeliveryPage() {
  const { trackingNumber } = useParams();
  const router = useRouter();
  const [info, setInfo] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetch(`/api/delivery/${trackingNumber}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => setInfo(d))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [trackingNumber]);

  // 데모 타임라인 (API 응답 없을 때)
  const demoEvents: DeliveryEvent[] = info?.events || [
    { time: new Date(Date.now() - 3600000 * 24).toISOString(), status: 'PICKED_UP', location: '서울 강남 허브', description: '물품이 발송되었습니다' },
    { time: new Date(Date.now() - 3600000 * 12).toISOString(), status: 'IN_TRANSIT', location: '대전 허브', description: '물품이 이동중입니다' },
    { time: new Date(Date.now() - 3600000 * 2).toISOString(), status: 'OUT_FOR_DELIVERY', location: '배달 출발', description: '배달이 시작되었습니다' },
  ];

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-red-600 mb-4 flex items-center gap-1 transition-colors">
          ← 뒤로가기
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">배송 조회</h1>

        {loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl h-32 animate-pulse border border-gray-100" />
            <div className="bg-white rounded-xl h-48 animate-pulse border border-gray-100" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 배송 헤더 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">운송장 번호</p>
                  <p className="font-bold text-gray-900 text-lg font-mono">{trackingNumber}</p>
                </div>
                <span className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  {info?.status === 'DELIVERED' ? '🎉 배송완료' : '🚚 배송중'}
                </span>
              </div>
              {info?.carrier && <p className="text-sm text-gray-500">택배사: {info.carrier}</p>}
              {info?.estimatedDelivery && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">
                    📅 예상 배송일: {new Date(info.estimatedDelivery).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                </div>
              )}
              {info?.recipientName && (
                <div className="mt-3 pt-3 border-t border-gray-50 text-sm text-gray-600">
                  <span className="font-medium">{info.recipientName}</span> · {info.shippingAddress}
                </div>
              )}
            </div>

            {/* 배송 타임라인 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-5">배송 현황</h2>
              {demoEvents.length === 0 ? (
                <p className="text-center text-gray-400 py-8">배송 정보가 없습니다</p>
              ) : (
                <div className="space-y-0">
                  {[...demoEvents].reverse().map((ev, i) => (
                    <div key={i} className="flex gap-4 relative">
                      {/* 타임라인 라인 */}
                      {i < demoEvents.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-100" />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm z-10 ${i === 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                        {STATUS_EMOJI[ev.status] || '📍'}
                      </div>
                      <div className="flex-1 pb-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm font-semibold ${i === 0 ? 'text-red-600' : 'text-gray-700'}`}>{ev.description}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{ev.location}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
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
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">배송 문의</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  📞 택배사 문의
                </button>
                <button className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  💬 LiveMart 고객센터
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
