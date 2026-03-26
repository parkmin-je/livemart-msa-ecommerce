'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';

const API_BASE = '';

const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

interface AdminOrder {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: { productId: number; productName?: string }[];
}

const statusConfig: Record<string, { style: React.CSSProperties; label: string }> = {
  PENDING:          { style: { background: 'rgba(234,179,8,0.08)',  color: 'rgb(161,98,7)',    border: '1px solid rgba(234,179,8,0.2)'  }, label: '대기' },
  CONFIRMED:        { style: { background: 'rgba(37,99,235,0.07)',  color: 'rgb(29,78,216)',   border: '1px solid rgba(37,99,235,0.2)'  }, label: '확인' },
  SHIPPED:          { style: { background: 'rgba(147,51,234,0.07)', color: 'rgb(109,40,217)',  border: '1px solid rgba(147,51,234,0.2)' }, label: '배송중' },
  SHIPPING:         { style: { background: 'rgba(147,51,234,0.07)', color: 'rgb(109,40,217)',  border: '1px solid rgba(147,51,234,0.2)' }, label: '배송중' },
  PAYMENT_COMPLETED:{ style: { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)',    border: '1px solid rgba(16,185,129,0.2)' }, label: '결제완료' },
  DELIVERED:        { style: { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)',    border: '1px solid rgba(16,185,129,0.2)' }, label: '완료' },
  CANCELLED:        { style: { background: 'rgba(14,14,14,0.06)',   color: 'rgba(14,14,14,0.45)', border: '1px solid rgba(14,14,14,0.12)' }, label: '취소' },
  RETURN_REQUESTED: { style: { background: 'rgba(234,88,12,0.07)',  color: 'rgb(194,65,12)',   border: '1px solid rgba(234,88,12,0.2)'  }, label: '반품요청' },
  RETURNED:         { style: { background: 'rgba(14,14,14,0.06)',   color: 'rgba(14,14,14,0.45)', border: '1px solid rgba(14,14,14,0.12)' }, label: '반품완료' },
  REFUNDED:         { style: { background: 'rgba(14,14,14,0.06)',   color: 'rgba(14,14,14,0.45)', border: '1px solid rgba(14,14,14,0.12)' }, label: '환불완료' },
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  '': '전체',
  PENDING: '대기',
  CONFIRMED: '확인',
  SHIPPED: '배송중',
  DELIVERED: '완료',
  CANCELLED: '취소',
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API_BASE}/api/orders/status/${statusFilter}?page=${page}&size=20`
        : `${API_BASE}/api/orders?page=${page}&size=20`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      setOrders(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, page]);

  const handleAction = async (orderId: number, action: string) => {
    if (action === 'cancel' && !confirm('주문을 취소하시겠습니까?')) return;
    try {
      const url = action === 'cancel'
        ? `${API_BASE}/api/orders/${orderId}/cancel?reason=관리자 취소`
        : `${API_BASE}/api/orders/${orderId}/${action}`;
      await fetch(url, { method: 'POST', credentials: 'include' });
      fetchOrders();
    } catch {
      alert('처리에 실패했습니다.');
    }
  };

  const filteredOrders = search.trim()
    ? orders.filter(o => o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search))
    : orders;

  const getStatusBadge = (status: string) => {
    const c = statusConfig[status] || statusConfig.CANCELLED;
    return <span className="px-2 py-0.5 text-[11px] font-semibold" style={c.style}>{c.label}</span>;
  };

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      {/* Admin header bar */}
      <div className="text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/admin" className="text-xs font-semibold tracking-widest uppercase transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>주문 관리</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-14 md:pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>주문 관리</h1>
          <a href="/admin" className="text-sm flex items-center gap-1 transition-colors"
            style={{ color: 'rgba(14,14,14,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.5)')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            대시보드
          </a>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-1 overflow-x-auto">
            {['', ...STATUSES].map(status => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(0); }}
                className="flex-shrink-0 px-3.5 py-2 text-xs font-semibold transition-colors"
                style={statusFilter === status
                  ? { background: '#0A0A0A', color: '#FFFFFF', border: '1px solid transparent' }
                  : { background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.12)', color: 'rgba(14,14,14,0.6)' }}
                onMouseEnter={e => { if (statusFilter !== status) e.currentTarget.style.background = '#F7F6F1'; }}
                onMouseLeave={e => { if (statusFilter !== status) e.currentTarget.style.background = '#FFFFFF'; }}
              >
                {STATUS_FILTER_LABELS[status] || status}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(14,14,14,0.4)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="주문번호 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 rounded-full mx-auto"
                style={{ border: '2px solid rgba(14,14,14,0.1)', borderTopColor: '#E8001D' }} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>주문이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F7F6F1', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
                  {['주문번호','사용자','상품','금액','상태','날짜','액션'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'rgba(14,14,14,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}
                    style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="font-medium text-sm transition-colors"
                        style={{ color: '#0E0E0E' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E8001D')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#0E0E0E')}
                      >
                        {order.orderNumber || `#${order.id}`}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>#{order.userId}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>{order.items?.length || 0}개 상품</td>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: '#0E0E0E' }}>{order.totalAmount?.toLocaleString()}원</td>
                    <td className="px-5 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleAction(order.id, 'confirm')}
                            className="px-2.5 py-1 text-xs font-medium transition-colors"
                            style={{ background: 'rgba(37,99,235,0.07)', color: 'rgb(29,78,216)', border: '1px solid rgba(37,99,235,0.2)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.14)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.07)')}
                          >확인</button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleAction(order.id, 'ship')}
                            className="px-2.5 py-1 text-xs font-medium transition-colors"
                            style={{ background: 'rgba(147,51,234,0.07)', color: 'rgb(109,40,217)', border: '1px solid rgba(147,51,234,0.2)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(147,51,234,0.14)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(147,51,234,0.07)')}
                          >배송</button>
                        )}
                        {order.status === 'SHIPPED' && (
                          <button
                            onClick={() => handleAction(order.id, 'deliver')}
                            className="px-2.5 py-1 text-xs font-medium transition-colors"
                            style={{ background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)', border: '1px solid rgba(16,185,129,0.2)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.16)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.08)')}
                          >완료</button>
                        )}
                        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleAction(order.id, 'cancel')}
                            className="px-2.5 py-1 text-xs font-medium transition-colors"
                            style={{ background: 'rgba(232,0,29,0.06)', color: '#C8001A', border: '1px solid rgba(232,0,29,0.2)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,0,29,0.12)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,0,29,0.06)')}
                          >취소</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(14,14,14,0.07)' }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm transition-colors disabled:opacity-40"
                style={{ border: '1px solid rgba(14,14,14,0.12)', color: 'rgba(14,14,14,0.6)', background: '#FFFFFF' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
              >이전</button>
              <span className="text-sm font-medium" style={{ color: 'rgba(14,14,14,0.5)' }}>{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm transition-colors disabled:opacity-40"
                style={{ border: '1px solid rgba(14,14,14,0.12)', color: 'rgba(14,14,14,0.6)', background: '#FFFFFF' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
              >다음</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
