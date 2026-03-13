'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
}

interface OrderDetail {
  id: number;
  orderNumber?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  deliveryAddress?: string;
  phoneNumber?: string;
  orderNote?: string;
  paymentMethod?: string;
  items?: OrderItem[];
  trackingNumber?: string;
}

const STATUS_STEPS = [
  { key: 'PAYMENT_COMPLETED', label: '결제완료' },
  { key: 'PREPARING', label: '상품준비' },
  { key: 'SHIPPED', label: '배송중' },
  { key: 'DELIVERED', label: '배송완료' },
];

const STATUS_MAP: Record<string, string> = {
  PENDING: '주문 대기', CONFIRMED: '주문 확인', PAYMENT_PENDING: '결제 대기',
  PAYMENT_COMPLETED: '결제 완료', PREPARING: '상품 준비중', SHIPPED: '배송중',
  DELIVERED: '배송 완료', CANCELLED: '취소됨', RETURN_REQUESTED: '반품 신청',
};

const STATUS_STYLE: Record<string, string> = {
  DELIVERED: 'bg-green-50 text-green-700 border border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200',
  SHIPPED: 'bg-purple-50 text-purple-700 border border-purple-200',
  RETURN_REQUESTED: 'bg-orange-50 text-orange-700 border border-orange-200',
};

function getStepIndex(status: string) {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[900px] mx-auto px-4 py-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 h-32 animate-pulse"/>)}
      </div>
    </main>
  );

  if (!order) return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[900px] mx-auto px-4 py-16 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-base font-bold text-gray-900 mb-4">주문을 찾을 수 없습니다</h2>
        <button
          onClick={() => router.push('/my-orders')}
          className="px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          주문 목록으로
        </button>
      </div>
    </main>
  );

  const stepIdx = getStepIndex(order.status);
  const isActive = !['CANCELLED', 'RETURN_REQUESTED'].includes(order.status);

  const defaultStatusStyle = 'bg-blue-50 text-blue-700 border border-blue-200';

  return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[900px] mx-auto px-4 py-6 space-y-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <button
              onClick={() => router.push('/my-orders')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              주문 목록
            </button>
            <h1 className="text-xl font-bold text-gray-900">주문 상세</h1>
            <p className="text-sm text-gray-500 mt-1">
              {order.orderNumber || `#${order.id}`} &middot; {new Date(order.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 ${STATUS_STYLE[order.status] || defaultStatusStyle}`}>
            {STATUS_MAP[order.status] || order.status}
          </span>
        </div>

        {/* 배송 진행 현황 */}
        {isActive && (
          <div className="bg-white border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-6">배송 현황</h2>
            <div className="relative flex items-center justify-between">
              {/* Progress track */}
              <div className="absolute left-0 right-0 h-0.5 bg-gray-200 top-4 z-0">
                <div
                  className="h-full bg-red-600 transition-all duration-700"
                  style={{ width: stepIdx < 0 ? '0%' : `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>
              {STATUS_STEPS.map((step, i) => {
                const done = i <= stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                      done ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-400'
                    } ${current ? 'ring-4 ring-red-100' : ''}`}>
                      {done ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs">{i + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs whitespace-nowrap font-medium ${done ? 'text-red-600' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {order.trackingNumber && (
              <div className="mt-5 p-3 bg-gray-50 border border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  운송장 번호: <span className="font-semibold">{order.trackingNumber}</span>
                </span>
                <button
                  onClick={() => router.push(`/delivery/${order.trackingNumber}`)}
                  className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  배송 조회
                </button>
              </div>
            )}
          </div>
        )}

        {/* 주문 상품 */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-4">주문 상품</h2>
          <div className="space-y-0 divide-y divide-gray-100">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="w-16 h-16 bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.quantity}개 × {Number(item.productPrice).toLocaleString()}원</p>
                </div>
                <p className="font-bold text-gray-900 text-sm">{Number(item.totalPrice).toLocaleString()}원</p>
              </div>
            ))}
          </div>

          {/* 금액 요약 */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>상품금액</span>
              <span>{Number(order.totalAmount).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>배송비</span>
              <span className="text-green-600 font-medium">무료</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>총 결제금액</span>
              <span className="text-red-600 text-lg">{Number(order.totalAmount).toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* 배송 정보 */}
          <div className="bg-white border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4">배송 정보</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex gap-3">
                <span className="text-gray-400 w-16 flex-shrink-0 text-xs pt-0.5">연락처</span>
                <span className="text-gray-900">{order.phoneNumber || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 w-16 flex-shrink-0 text-xs pt-0.5">주소</span>
                <span className="text-gray-900">{order.deliveryAddress || '-'}</span>
              </div>
              {order.orderNote && (
                <div className="flex gap-3">
                  <span className="text-gray-400 w-16 flex-shrink-0 text-xs pt-0.5">메모</span>
                  <span className="text-gray-900">{order.orderNote}</span>
                </div>
              )}
            </div>
          </div>

          {/* 결제 정보 */}
          <div className="bg-white border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4">결제 정보</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">결제 수단</span>
                <span className="font-medium text-gray-900">{order.paymentMethod || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">결제 금액</span>
                <span className="font-bold text-red-600">{Number(order.totalAmount).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 flex-wrap">
          {order.status === 'DELIVERED' && (
            <>
              <button className="px-5 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                리뷰 작성
              </button>
              <button
                onClick={() => router.push('/returns')}
                className="px-5 py-2 border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                반품/교환 신청
              </button>
            </>
          )}
          {['PENDING','CONFIRMED','PAYMENT_PENDING'].includes(order.status) && (
            <button className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
              주문 취소
            </button>
          )}
          <button
            onClick={() => router.push('/my-orders')}
            className="px-5 py-2 border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            목록으로
          </button>
        </div>
      </div>
    </main>
  );
}
