'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

const statusConfig: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-yellow-100 text-yellow-800', label: '대기' },
  CONFIRMED: { cls: 'bg-blue-100 text-blue-800', label: '확인' },
  SHIPPED: { cls: 'bg-purple-100 text-purple-800', label: '배송중' },
  DELIVERED: { cls: 'bg-green-100 text-green-800', label: '완료' },
  CANCELLED: { cls: 'bg-red-100 text-red-800', label: '취소' },
  RETURN_REQUESTED: { cls: 'bg-orange-100 text-orange-800', label: '반품요청' },
  RETURNED: { cls: 'bg-gray-100 text-gray-800', label: '반품완료' },
  REFUNDED: { cls: 'bg-gray-100 text-gray-800', label: '환불완료' },
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API_BASE}/api/orders/status/${statusFilter}?page=${page}&size=20`
        : `${API_BASE}/api/orders/user/1?page=${page}&size=20`;
      const res = await fetch(url);
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
      await fetch(url, { method: 'POST' });
      fetchOrders();
    } catch {
      alert('처리에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    const c = statusConfig[status] || statusConfig.PENDING;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.cls}`}>{c.label}</span>;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/seller" className="text-sm text-gray-700 hover:text-blue-600">판매자</a>
              <span className="text-sm font-medium text-blue-600">주문 관리</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">주문 관리 (Admin)</h1>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => { setStatusFilter(''); setPage(0); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              !statusFilter ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            전체
          </button>
          {STATUSES.map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(0); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                statusFilter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {statusConfig[status].label}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">주문이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="text-blue-600 hover:underline font-medium text-sm"
                      >
                        {order.orderNumber}
                      </button>
                      <div className="text-xs text-gray-400">
                        {order.items?.length || 0}개 상품
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                    <td className="px-6 py-4 font-medium">₩{order.totalAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleAction(order.id, 'confirm')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >확인</button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleAction(order.id, 'ship')}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                          >배송</button>
                        )}
                        {order.status === 'SHIPPED' && (
                          <button
                            onClick={() => handleAction(order.id, 'deliver')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                          >완료</button>
                        )}
                        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleAction(order.id, 'cancel')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >취소</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                이전
              </button>
              <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
