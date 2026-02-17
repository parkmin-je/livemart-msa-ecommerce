'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  todayOrders: number;
  totalProducts: number;
  totalUsers: number;
}

interface RecentOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

const statusConfig: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-yellow-100 text-yellow-800', label: '대기' },
  CONFIRMED: { cls: 'bg-blue-100 text-blue-800', label: '확인' },
  SHIPPED: { cls: 'bg-purple-100 text-purple-800', label: '배송중' },
  DELIVERED: { cls: 'bg-green-100 text-green-800', label: '완료' },
  CANCELLED: { cls: 'bg-red-100 text-red-800', label: '취소' },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalOrders: 0, totalRevenue: 0, pendingOrders: 0, todayOrders: 0, totalProducts: 0, totalUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/api/orders/user/1?page=0&size=10`, { headers }).then(r => r.json()).catch(() => ({ content: [] })),
      fetch(`${API_BASE}/api/products?page=0&size=1`, { headers }).then(r => r.json()).catch(() => ({ totalElements: 0 })),
    ]).then(([orderData, productData]) => {
      const orders: RecentOrder[] = orderData?.content || [];
      setRecentOrders(orders.slice(0, 5));

      const totalRevenue = orders.reduce((sum: number, o: RecentOrder) => sum + (o.totalAmount || 0), 0);
      const pendingOrders = orders.filter((o: RecentOrder) => o.status === 'PENDING').length;
      const today = new Date().toDateString();
      const todayOrders = orders.filter((o: RecentOrder) => new Date(o.createdAt).toDateString() === today).length;

      setMetrics({
        totalOrders: orderData?.totalElements || orders.length,
        totalRevenue,
        pendingOrders,
        todayOrders,
        totalProducts: productData?.totalElements || 0,
        totalUsers: 0,
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/admin/orders" className="text-sm text-gray-700 hover:text-blue-600">주문관리</a>
              <a href="/admin/users" className="text-sm text-gray-700 hover:text-blue-600">유저관리</a>
              <a href="/admin/coupons" className="text-sm text-gray-700 hover:text-blue-600">쿠폰</a>
              <a href="/seller/products" className="text-sm text-gray-700 hover:text-blue-600">상품관리</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">관리자 대시보드</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: '총 주문', value: metrics.totalOrders.toLocaleString(), sub: '전체', color: 'bg-blue-500' },
            { label: '총 매출', value: `${metrics.totalRevenue.toLocaleString()}원`, sub: '누적', color: 'bg-green-500' },
            { label: '처리 대기', value: metrics.pendingOrders.toString(), sub: '미처리', color: 'bg-yellow-500' },
            { label: '총 상품', value: metrics.totalProducts.toLocaleString(), sub: '등록', color: 'bg-purple-500' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${card.color}`} />
                <span className="text-sm text-gray-500">{card.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: '주문 관리', href: '/admin/orders', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: '유저 관리', href: '/admin/users', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
            { label: '쿠폰 관리', href: '/admin/coupons', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
            { label: '재고 관리', href: '/seller/inventory', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
          ].map((action) => (
            <a key={action.label} href={action.href} className={`p-4 rounded-xl text-center font-medium transition ${action.color}`}>
              {action.label}
            </a>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">최근 주문</h2>
            <a href="/admin/orders" className="text-sm text-blue-600 hover:underline">전체 보기</a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">주문이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">주문번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">날짜</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                    <td className="px-6 py-4 text-sm text-blue-600 font-medium">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${(statusConfig[order.status] || statusConfig.PENDING).cls}`}>
                        {(statusConfig[order.status] || statusConfig.PENDING).label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{order.totalAmount?.toLocaleString()}원</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
