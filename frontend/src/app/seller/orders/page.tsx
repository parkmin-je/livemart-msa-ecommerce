'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface SellerOrder {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  shippingAddress?: string;
  items?: { productId: number; productName?: string; quantity: number; price: number }[];
}

const statusConfig: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-yellow-100 text-yellow-800', label: '대기' },
  CONFIRMED: { cls: 'bg-blue-100 text-blue-800', label: '확인' },
  SHIPPED: { cls: 'bg-purple-100 text-purple-800', label: '배송중' },
  DELIVERED: { cls: 'bg-green-100 text-green-800', label: '완료' },
  CANCELLED: { cls: 'bg-red-100 text-red-800', label: '취소' },
  RETURN_REQUESTED: { cls: 'bg-orange-100 text-orange-800', label: '반품요청' },
};

export default function SellerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const url = filter
        ? `${API_BASE}/api/orders/status/${filter}?page=${page}&size=15`
        : `${API_BASE}/api/orders/user/1?page=${page}&size=15`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrders(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [filter, page]);

  const handleStatusChange = async (orderId: number, action: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const url = action === 'cancel'
        ? `${API_BASE}/api/orders/${orderId}/cancel?reason=판매자 취소`
        : `${API_BASE}/api/orders/${orderId}/${action}`;
      await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      toast.success('주문 상태가 변경되었습니다.');
      fetchOrders();
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/seller" className="text-sm text-gray-700 hover:text-blue-600">대시보드</a>
              <a href="/seller/products" className="text-sm text-gray-700 hover:text-blue-600">상품</a>
              <a href="/seller/inventory" className="text-sm text-gray-700 hover:text-blue-600">재고</a>
              <span className="text-sm font-medium text-blue-600">주문관리</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">판매자 주문 관리</h1>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">처리 대기</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">배송 준비</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{confirmedCount}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">전체 주문</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">매출</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{orders.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString()}원</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button onClick={() => { setFilter(''); setPage(0); }} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${!filter ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>전체</button>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => { setFilter(key); setPage(0); }} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{cfg.label}</button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Order List */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center text-gray-500">주문이 없습니다.</div>
              ) : (
                <div className="divide-y">
                  {orders.map((order) => (
                    <div key={order.id} className={`p-5 hover:bg-gray-50 cursor-pointer transition ${selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`} onClick={() => setSelectedOrder(order)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleDateString('ko-KR')} {new Date(order.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${(statusConfig[order.status] || statusConfig.PENDING).cls}`}>
                            {(statusConfig[order.status] || statusConfig.PENDING).label}
                          </span>
                          <div className="text-sm font-bold text-gray-900 mt-1">{order.totalAmount?.toLocaleString()}원</div>
                        </div>
                      </div>
                      {/* Quick Actions */}
                      <div className="flex gap-2 mt-3">
                        {order.status === 'PENDING' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'confirm'); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">주문 확인</button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'ship'); }} className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200">배송 시작</button>
                        )}
                        {order.status === 'SHIPPED' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'deliver'); }} className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">배송 완료</button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/orders/${order.id}`); }} className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">상세보기</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50">이전</button>
                  <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50">다음</button>
                </div>
              )}
            </div>
          </div>

          {/* Order Detail Panel */}
          {selectedOrder && (
            <div className="w-96 flex-shrink-0 hidden lg:block">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">주문 상세</h3>
                <dl className="space-y-3 text-sm">
                  <div><dt className="text-gray-500">주문번호</dt><dd className="font-medium">{selectedOrder.orderNumber}</dd></div>
                  <div><dt className="text-gray-500">상태</dt><dd><span className={`px-2 py-1 rounded-full text-xs font-medium ${(statusConfig[selectedOrder.status] || statusConfig.PENDING).cls}`}>{(statusConfig[selectedOrder.status] || statusConfig.PENDING).label}</span></dd></div>
                  <div><dt className="text-gray-500">주문일</dt><dd>{new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}</dd></div>
                  <div><dt className="text-gray-500">금액</dt><dd className="font-bold text-lg text-blue-600">{selectedOrder.totalAmount?.toLocaleString()}원</dd></div>
                  {selectedOrder.shippingAddress && (
                    <div><dt className="text-gray-500">배송지</dt><dd>{selectedOrder.shippingAddress}</dd></div>
                  )}
                </dl>
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">주문 상품</h4>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.productName || `상품 #${item.productId}`} x{item.quantity}</span>
                          <span className="font-medium">{(item.price * item.quantity).toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => router.push(`/orders/${selectedOrder.id}`)} className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">주문 상세 페이지</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
