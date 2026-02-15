'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
}

interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  deliveryAddress: string;
  phoneNumber: string;
  orderNote: string;
  paymentMethod: string;
  paymentTransactionId: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

const STATUS_STEPS = [
  { key: 'PENDING', label: '주문 접수', icon: '📋', color: 'yellow' },
  { key: 'CONFIRMED', label: '결제 완료', icon: '💳', color: 'blue' },
  { key: 'SHIPPED', label: '배송 시작', icon: '🚚', color: 'purple' },
  { key: 'DELIVERED', label: '배송 완료', icon: '📦', color: 'green' },
];

const CANCELLED_STATUS = { key: 'CANCELLED', label: '주문 취소', icon: '❌', color: 'red' };

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : -1;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/orders/${orderId}`)
      .then(r => r.json())
      .then(data => { setOrder(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [orderId]);

  const handleAction = async (action: string) => {
    if (action === 'cancel' && !confirm('정말 주문을 취소하시겠습니까?')) return;
    try {
      const url = action === 'cancel'
        ? `${API_BASE}/api/orders/${orderId}/cancel?reason=고객 요청`
        : `${API_BASE}/api/orders/${orderId}/${action}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      setOrder(data);
    } catch {
      alert('처리에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">주문을 찾을 수 없습니다</h2>
          <button onClick={() => router.push('/my-orders')} className="text-blue-600 hover:underline">
            주문 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isReturned = order.status === 'RETURN_REQUESTED' || order.status === 'RETURNED' || order.status === 'REFUNDED';

  const stepDates: Record<string, string | null> = {
    PENDING: order.createdAt,
    CONFIRMED: order.confirmedAt,
    SHIPPED: order.shippedAt,
    DELIVERED: order.deliveredAt,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">상품</a>
              <a href="/cart" className="text-sm text-gray-700 hover:text-blue-600">장바구니</a>
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.push('/my-orders')} className="text-sm text-gray-500 hover:text-blue-600 mb-2 block">
              &larr; 주문 목록
            </button>
            <h1 className="text-2xl font-bold text-gray-900">주문 상세</h1>
            <p className="text-gray-500 mt-1">주문번호: {order.orderNumber}</p>
          </div>
          <div>
            {isCancelled ? (
              <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-medium">취소됨</span>
            ) : isReturned ? (
              <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full font-medium">반품/환불</span>
            ) : (
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                {STATUS_STEPS[currentStep]?.label || order.status}
              </span>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-8">배송 추적</h2>

          {isCancelled ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-5xl mb-4">{CANCELLED_STATUS.icon}</div>
                <div className="text-lg font-medium text-red-600">{CANCELLED_STATUS.label}</div>
                <div className="text-sm text-gray-500 mt-1">{formatDate(order.cancelledAt)}</div>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Progress Bar */}
              <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 mx-12">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>

              {/* Steps */}
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center" style={{ width: '25%' }}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl z-10 transition-all ${
                        isCompleted
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-blue-200 scale-110' : ''}`}>
                        {step.icon}
                      </div>
                      <div className={`mt-3 text-sm font-medium ${isCompleted ? 'text-blue-600' : 'text-gray-400'}`}>
                        {step.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(stepDates[step.key])}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">주문 상품</h2>
          <div className="divide-y">
            {order.items.map(item => (
              <div key={item.id} className="py-4 flex items-center gap-4">
                <div
                  className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center cursor-pointer"
                  onClick={() => router.push(`/products/${item.productId}`)}
                >
                  <span className="text-2xl">📦</span>
                </div>
                <div className="flex-1">
                  <h3
                    className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => router.push(`/products/${item.productId}`)}
                  >
                    {item.productName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    ₩{item.productPrice?.toLocaleString()} x {item.quantity}개
                  </p>
                </div>
                <div className="text-right font-bold text-gray-900">
                  ₩{item.totalPrice?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>총 결제 금액</span>
              <span className="text-blue-600">₩{order.totalAmount?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">배송 정보</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">배송지</dt>
                <dd className="font-medium">{order.deliveryAddress}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">연락처</dt>
                <dd className="font-medium">{order.phoneNumber}</dd>
              </div>
              {order.orderNote && (
                <div>
                  <dt className="text-sm text-gray-500">배송 메모</dt>
                  <dd className="font-medium">{order.orderNote}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">결제 정보</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">결제 수단</dt>
                <dd className="font-medium">{order.paymentMethod}</dd>
              </div>
              {order.paymentTransactionId && (
                <div>
                  <dt className="text-sm text-gray-500">거래 ID</dt>
                  <dd className="font-medium font-mono text-sm">{order.paymentTransactionId}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">주문일시</dt>
                <dd className="font-medium">{formatDate(order.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Actions */}
        {!isCancelled && !isReturned && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">주문 관리</h2>
            <div className="flex flex-wrap gap-3">
              {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                <button
                  onClick={() => handleAction('cancel')}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  주문 취소
                </button>
              )}
              {order.status === 'PENDING' && (
                <button
                  onClick={() => handleAction('confirm')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  결제 확인
                </button>
              )}
              {order.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleAction('ship')}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  배송 시작
                </button>
              )}
              {order.status === 'SHIPPED' && (
                <button
                  onClick={() => handleAction('deliver')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  배송 완료
                </button>
              )}
              {order.status === 'DELIVERED' && (
                <button
                  onClick={() => router.push(`/products/${order.items[0]?.productId}`)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  리뷰 작성
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
