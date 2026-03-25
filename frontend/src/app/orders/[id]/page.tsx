'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

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
  PAYMENT_COMPLETED: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const CANCEL_REASONS = [
  '단순 변심',
  '배송 지연',
  '상품 정보 다름',
  '중복 주문',
  '가격 오류',
  '기타',
];

function getStepIndex(status: string) {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('단순 변심');
  const [cancelling, setCancelling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOrder = useCallback(() => {
    return fetch(`/api/orders/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setOrder(data);
        setLastUpdated(new Date());
      })
      .catch(() => setOrder(null));
  }, [id]);

  useEffect(() => {
    fetchOrder().finally(() => setLoading(false));

    // 배송중/준비중 상태면 30초마다 polling
    const pollId = setInterval(() => {
      if (order && ['PAYMENT_COMPLETED', 'PREPARING', 'SHIPPED'].includes(order.status)) {
        fetchOrder();
      }
    }, 30000);

    return () => clearInterval(pollId);
  }, [fetchOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel?reason=${encodeURIComponent(cancelReason)}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success('주문이 취소됐습니다.');
        setShowCancelModal(false);
        await fetchOrder();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || '주문 취소에 실패했습니다.');
      }
    } catch {
      toast.error('주문 취소에 실패했습니다.');
    }
    setCancelling(false);
  };

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
  const canCancel = ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED'].includes(order.status);
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
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-sm font-semibold px-3 py-1.5 ${STATUS_STYLE[order.status] || defaultStatusStyle}`}>
              {STATUS_MAP[order.status] || order.status}
            </span>
            {/* 새로고침 버튼 */}
            <button
              onClick={() => fetchOrder()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {lastUpdated ? `${lastUpdated.getHours().toString().padStart(2,'0')}:${lastUpdated.getMinutes().toString().padStart(2,'0')} 업데이트` : '새로고침'}
            </button>
          </div>
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
                <a
                  href={`https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${order.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  배송 조회
                </a>
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
                <button
                  onClick={() => router.push(`/products/${item.productId}`)}
                  className="w-16 h-16 bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </button>
                <div className="flex-1">
                  <p
                    className="font-medium text-gray-900 text-sm cursor-pointer hover:text-red-600 transition-colors"
                    onClick={() => router.push(`/products/${item.productId}`)}
                  >{item.productName}</p>
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

          {/* 포인트 적립 */}
          {order.status === 'DELIVERED' && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
              </svg>
              <span className="text-xs text-amber-700">
                이 주문으로 <span className="font-bold">{Math.floor(Number(order.totalAmount) * 0.01).toLocaleString()}P</span> 포인트가 적립됐습니다
              </span>
            </div>
          )}
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
              <button
                onClick={() => router.push(`/products/${order.items?.[0]?.productId || ''}`)}
                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
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
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
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

      {/* 주문 취소 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">주문 취소</h3>
            <p className="text-sm text-gray-600 mb-4">취소 사유를 선택해주세요.</p>
            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map(reason => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${cancelReason === reason ? 'border-red-600 bg-red-600' : 'border-gray-300 group-hover:border-gray-500'}`}>
                    {cancelReason === reason && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm text-gray-700">{reason}</span>
                  <input type="radio" className="sr-only" value={reason} checked={cancelReason === reason} onChange={() => setCancelReason(reason)} />
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelling ? '취소 중...' : '주문 취소'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
