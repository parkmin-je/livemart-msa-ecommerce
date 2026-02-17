'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { deliveryApi } from '@/api/productApi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface DeliveryEvent {
  status: string;
  location: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

interface DeliveryInfo {
  trackingNumber: string;
  orderId: number;
  courierCompany: string;
  status: string;
  currentLocation: string;
  recipientName: string;
  estimatedDelivery: string;
  events: DeliveryEvent[];
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  PREPARING: { label: '상품 준비', icon: '📋', color: 'text-yellow-600' },
  PICKED_UP: { label: '집하 완료', icon: '📤', color: 'text-blue-600' },
  IN_TRANSIT: { label: '배송 중', icon: '🚚', color: 'text-purple-600' },
  OUT_FOR_DELIVERY: { label: '배달 출발', icon: '🏃', color: 'text-indigo-600' },
  DELIVERED: { label: '배송 완료', icon: '✅', color: 'text-green-600' },
  FAILED: { label: '배송 실패', icon: '❌', color: 'text-red-600' },
};

const DELIVERY_STEPS = ['PREPARING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DeliveryTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const trackingNumber = params.trackingNumber as string;
  const eventSourceRef = useRef<EventSource | null>(null);

  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    loadDelivery();
    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [trackingNumber]);

  const loadDelivery = async () => {
    try {
      const data = await deliveryApi.getDeliveryInfo(trackingNumber);
      setDelivery(data);
    } catch {
      // will show not found
    } finally {
      setLoading(false);
    }
  };

  const connectSSE = () => {
    const url = `${API_BASE}/api/delivery/${trackingNumber}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setSseConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DeliveryInfo;
        setDelivery(data);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setSseConnected(false);
      es.close();
      setTimeout(connectSSE, 5000);
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">배송 정보를 찾을 수 없습니다</h2>
          <button onClick={() => router.push('/my-orders')} className="text-blue-600 hover:underline">
            주문 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[delivery.status] || { label: delivery.status, icon: '📦', color: 'text-gray-600' };
  const currentIdx = DELIVERY_STEPS.indexOf(delivery.status);
  const progressPct = currentIdx >= 0 ? (currentIdx / (DELIVERY_STEPS.length - 1)) * 100 : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
              <a href="/profile" className="text-sm text-gray-700 hover:text-blue-600">마이페이지</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-blue-600 mb-2 block">
              &larr; 뒤로가기
            </button>
            <h1 className="text-2xl font-bold text-gray-900">배송 추적</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-500">{sseConnected ? '실시간 연결' : '연결 끊김'}</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{statusInfo.icon}</div>
            <div className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.label}</div>
            {delivery.currentLocation && (
              <div className="text-gray-500 mt-1">현재 위치: {delivery.currentLocation}</div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">운송장 번호</div>
              <div className="font-mono font-medium mt-1">{delivery.trackingNumber}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">택배사</div>
              <div className="font-medium mt-1">{delivery.courierCompany}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">주문 ID</div>
              <div className="font-medium mt-1">
                <button onClick={() => router.push(`/orders/${delivery.orderId}`)} className="text-blue-600 hover:underline">
                  #{delivery.orderId}
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">배송 예정</div>
              <div className="font-medium mt-1">{delivery.estimatedDelivery || '-'}</div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-6">배송 진행 상황</h2>
          <div className="flex justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 mx-8">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            {DELIVERY_STEPS.map((step) => {
              const stepIdx = DELIVERY_STEPS.indexOf(step);
              const isActive = stepIdx <= currentIdx;
              const isCurrent = stepIdx === currentIdx;
              const info = STATUS_MAP[step];
              return (
                <div key={step} className="flex flex-col items-center z-10" style={{ width: '20%' }}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition ${
                    isActive ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-blue-200 scale-110' : ''}`}>
                    {info?.icon}
                  </div>
                  <span className={`text-xs mt-2 text-center ${isActive ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {info?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Timeline */}
        {delivery.events && delivery.events.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-6">배송 이력</h2>
            <div className="space-y-0">
              {delivery.events.map((event, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    {idx < delivery.events.length - 1 && <div className="w-0.5 h-full bg-gray-200 min-h-[3rem]" />}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {STATUS_MAP[event.status]?.label || event.status}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(event.timestamp)}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{event.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
