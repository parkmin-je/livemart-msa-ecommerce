'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface Order {
  id: number;
  orderNumber?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: OrderItem[];
  shippingAddress?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; emoji: string }> = {
  PENDING: { label: '주문 대기', color: 'badge-yellow', emoji: '⏳' },
  CONFIRMED: { label: '주문 확인', color: 'badge-blue', emoji: '✅' },
  PAYMENT_PENDING: { label: '결제 대기', color: 'badge-yellow', emoji: '💳' },
  PAYMENT_COMPLETED: { label: '결제 완료', color: 'badge-green', emoji: '✅' },
  PREPARING: { label: '상품 준비중', color: 'badge-blue', emoji: '📦' },
  SHIPPED: { label: '배송중', color: 'badge-purple', emoji: '🚚' },
  DELIVERED: { label: '배송 완료', color: 'badge-green', emoji: '🎉' },
  CANCELLED: { label: '취소됨', color: 'badge-gray', emoji: '❌' },
  RETURN_REQUESTED: { label: '반품 신청', color: 'badge-red', emoji: '↩️' },
};

function getStatus(s: string) {
  return STATUS_MAP[s] || { label: s, color: 'badge-gray', emoji: '📋' };
}

export function OrderList() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (!userId) { setLoading(false); return; }
    fetch(`/api/orders/user/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => setOrders(d.content || d || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? orders
    : orders.filter(o => o.status === filter || (filter === 'ACTIVE' && !['DELIVERED', 'CANCELLED'].includes(o.status)));

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
          <div className="flex justify-between mb-3"><div className="h-4 bg-gray-200 rounded w-32"/><div className="h-5 bg-gray-200 rounded w-16"/></div>
          <div className="flex gap-3"><div className="w-16 h-16 bg-gray-200 rounded-lg"/><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4"/><div className="h-3 bg-gray-200 rounded w-1/2"/></div></div>
        </div>
      ))}
    </div>
  );

  if (!localStorage.getItem('userId')) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
      <p className="text-gray-500 mb-6">주문 내역을 확인하려면 로그인하세요</p>
      <a href="/auth" className="btn-primary px-6">로그인하기</a>
    </div>
  );

  return (
    <div>
      {/* 필터 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: '전체' },
          { id: 'ACTIVE', label: '진행중' },
          { id: 'DELIVERED', label: '배송완료' },
          { id: 'CANCELLED', label: '취소' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filter === f.id ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">주문 내역이 없습니다</h2>
          <p className="text-gray-500 mb-6">첫 번째 주문을 해보세요!</p>
          <a href="/products" className="btn-primary px-6">쇼핑하기</a>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const st = getStatus(order.status);
            const firstItem = order.items?.[0];
            return (
              <div key={order.id}
                className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/orders/${order.id}`)}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">주문번호: #{order.id}</span>
                    </div>
                    <span className={`${st.color} text-xs`}>{st.emoji} {st.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {firstItem?.imageUrl ? (
                        <img src={firstItem.imageUrl} alt={firstItem.productName} className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-1">
                        {firstItem?.productName || '상품 정보 없음'}
                        {(order.items?.length || 0) > 1 && <span className="text-gray-500"> 외 {(order.items?.length || 1) - 1}개</span>}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        총 <span className="font-bold text-gray-900">{order.totalAmount.toLocaleString()}원</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                    <button onClick={() => router.push(`/orders/${order.id}`)}
                      className="btn-outline-red text-xs px-3 py-1.5">주문 상세</button>
                    {order.status === 'DELIVERED' && (
                      <button className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                        리뷰 작성
                      </button>
                    )}
                    {['PENDING','CONFIRMED','PAYMENT_PENDING'].includes(order.status) && (
                      <button className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                        주문 취소
                      </button>
                    )}
                    {order.status === 'DELIVERED' && (
                      <button onClick={() => router.push('/returns')}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                        반품/교환
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
