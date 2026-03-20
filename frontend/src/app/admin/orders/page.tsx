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

const statusConfig: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200', label: '대기' },
  CONFIRMED: { cls: 'bg-blue-50 text-blue-700 border border-blue-200', label: '확인' },
  SHIPPED: { cls: 'bg-purple-50 text-purple-700 border border-purple-200', label: '배송중' },
  DELIVERED: { cls: 'bg-green-50 text-green-700 border border-green-200', label: '완료' },
  CANCELLED: { cls: 'bg-gray-100 text-gray-500 border border-gray-200', label: '취소' },
  RETURN_REQUESTED: { cls: 'bg-orange-50 text-orange-700 border border-orange-200', label: '반품요청' },
  RETURNED: { cls: 'bg-gray-100 text-gray-500 border border-gray-200', label: '반품완료' },
  REFUNDED: { cls: 'bg-gray-100 text-gray-500 border border-gray-200', label: '환불완료' },
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
      const res = await fetch(url, {
        credentials: 'include',
      });
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
      await fetch(url, {
        method: 'POST',
        credentials: 'include',
      });
      fetchOrders();
    } catch {
      alert('처리에 실패했습니다.');
    }
  };

  const filteredOrders = search.trim()
    ? orders.filter(o => o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search))
    : orders;

  const getStatusBadge = (status: string) => {
    const c = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${c.cls}`}>{c.label}</span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav />

      {/* Admin header bar */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/admin" className="text-xs font-semibold tracking-widest text-gray-400 uppercase hover:text-white transition-colors">Admin</a>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-300">주문 관리</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-14 md:pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-900">주문 관리</h1>
          <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            대시보드
          </a>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {['', ...STATUSES].map(status => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(0); }}
                className={`flex-shrink-0 px-3.5 py-2 text-xs font-semibold transition-colors ${
                  statusFilter === status
                    ? 'bg-gray-950 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {STATUS_FILTER_LABELS[status] || status}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="주문번호 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">주문이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">주문번호</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">사용자</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상품</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">금액</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">날짜</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="font-medium text-sm text-gray-900 hover:text-red-600 transition-colors"
                      >
                        {order.orderNumber || `#${order.id}`}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">#{order.userId}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{order.items?.length || 0}개 상품</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">{order.totalAmount?.toLocaleString()}원</td>
                    <td className="px-5 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleAction(order.id, 'confirm')}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            확인
                          </button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleAction(order.id, 'ship')}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium hover:bg-purple-100 transition-colors"
                          >
                            배송
                          </button>
                        )}
                        {order.status === 'SHIPPED' && (
                          <button
                            onClick={() => handleAction(order.id, 'deliver')}
                            className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            완료
                          </button>
                        )}
                        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleAction(order.id, 'cancel')}
                            className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <span className="text-sm text-gray-500 font-medium">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
