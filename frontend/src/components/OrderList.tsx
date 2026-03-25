'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  productPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

interface Order {
  id: number;
  orderNumber?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: OrderItem[];
  deliveryAddress?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:            { label: '주문 대기',  bg: 'rgba(234,179,8,0.08)',   color: 'rgb(161,98,7)' },
  CONFIRMED:          { label: '주문 확인',  bg: 'rgba(59,130,246,0.08)',  color: 'rgb(37,99,235)' },
  PAYMENT_PENDING:    { label: '결제 대기',  bg: 'rgba(234,179,8,0.08)',   color: 'rgb(161,98,7)' },
  PAYMENT_COMPLETED:  { label: '결제 완료',  bg: 'rgba(34,197,94,0.08)',   color: 'rgb(21,128,61)' },
  PREPARING:          { label: '상품 준비중', bg: 'rgba(59,130,246,0.08)', color: 'rgb(37,99,235)' },
  SHIPPED:            { label: '배송중',     bg: 'rgba(168,85,247,0.08)', color: 'rgb(126,34,206)' },
  DELIVERED:          { label: '배송 완료',  bg: 'rgba(34,197,94,0.08)',   color: 'rgb(21,128,61)' },
  CANCELLED:          { label: '취소됨',     bg: 'rgba(14,14,14,0.06)',    color: 'rgba(14,14,14,0.45)' },
  RETURN_REQUESTED:   { label: '반품 신청',  bg: 'rgba(232,0,29,0.07)',    color: '#E8001D' },
};

function getStatus(s: string) {
  return STATUS_MAP[s] || { label: s, bg: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.45)' };
}

export function OrderList() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    fetch(`/api/orders/user/${uid}`, { credentials: 'include' })
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
        <div key={i} className="p-5 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          <div className="flex justify-between mb-3">
            <div className="h-4 rounded w-32" style={{ background: '#EDEBE4' }} />
            <div className="h-5 rounded w-16" style={{ background: '#EDEBE4' }} />
          </div>
          <div className="flex gap-3">
            <div className="w-16 h-16" style={{ background: '#EDEBE4' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded w-3/4" style={{ background: '#EDEBE4' }} />
              <div className="h-3 rounded w-1/2" style={{ background: '#EDEBE4' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!userId) return (
    <div className="text-center py-20" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
      <div className="flex justify-center mb-4">
        <svg className="w-16 h-16" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>로그인이 필요합니다</h2>
      <p className="mb-6" style={{ color: 'rgba(14,14,14,0.5)' }}>주문 내역을 확인하려면 로그인하세요</p>
      <a
        href="/auth"
        className="inline-block px-6 py-2 text-white text-sm font-bold transition-colors"
        style={{ background: '#0A0A0A' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
      >
        로그인하기
      </a>
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
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors"
            style={{
              border: filter === f.id ? '1px solid #E8001D' : '1px solid rgba(14,14,14,0.14)',
              background: filter === f.id ? '#E8001D' : 'transparent',
              color: filter === f.id ? '#FFFFFF' : 'rgba(14,14,14,0.65)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>주문 내역이 없습니다</h2>
          <p className="mb-6" style={{ color: 'rgba(14,14,14,0.5)' }}>첫 번째 주문을 해보세요!</p>
          <a
            href="/products"
            className="inline-block px-6 py-2 text-white text-sm font-bold transition-colors"
            style={{ background: '#0A0A0A' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
          >
            쇼핑하기
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const st = getStatus(order.status);
            const firstItem = order.items?.[0];
            return (
              <div
                key={order.id}
                className="cursor-pointer transition-colors"
                style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
                onClick={() => router.push(`/orders/${order.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.07)')}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>
                        {new Date(order.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>주문번호: #{order.id}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#F5F4F0' }}>
                      {firstItem?.imageUrl ? (
                        <img src={firstItem.imageUrl} alt={firstItem.productName} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-7 h-7" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1" style={{ color: '#0E0E0E' }}>
                        {firstItem?.productName || '상품 정보 없음'}
                        {(order.items?.length || 0) > 1 && (
                          <span style={{ color: 'rgba(14,14,14,0.5)' }}> 외 {(order.items?.length || 1) - 1}개</span>
                        )}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>
                        총 <span className="font-bold" style={{ color: '#0E0E0E' }}>{order.totalAmount.toLocaleString()}원</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="text-xs px-3 py-1.5 font-semibold transition-colors"
                      style={{ border: '1px solid #E8001D', color: '#E8001D', background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#E8001D'; e.currentTarget.style.color = '#FFFFFF'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E8001D'; }}
                    >
                      주문 상세
                    </button>
                    {order.status === 'DELIVERED' && (
                      <button
                        className="text-xs px-3 py-1.5 transition-colors"
                        style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.65)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.3)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.14)')}
                      >
                        리뷰 작성
                      </button>
                    )}
                    {['PENDING','CONFIRMED','PAYMENT_PENDING'].includes(order.status) && (
                      <button
                        className="text-xs px-3 py-1.5 transition-colors"
                        style={{ border: '1px solid rgba(232,0,29,0.3)', color: '#E8001D' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,0,29,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        주문 취소
                      </button>
                    )}
                    {order.status === 'DELIVERED' && (
                      <button
                        onClick={() => router.push('/returns')}
                        className="text-xs px-3 py-1.5 transition-colors"
                        style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.65)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.3)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.14)')}
                      >
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
