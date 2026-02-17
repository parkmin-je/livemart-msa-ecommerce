'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface OrderForAnalytics {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: { date: string; revenue: number; count: number }[];
  topDay: string;
}

function computeAnalytics(orders: OrderForAnalytics[]): AnalyticsData {
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const ordersByStatus: Record<string, number> = {};
  orders.forEach(o => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

  const byDay: Record<string, { revenue: number; count: number }> = {};
  orders.forEach(o => {
    const date = new Date(o.createdAt).toLocaleDateString('ko-KR');
    if (!byDay[date]) byDay[date] = { revenue: 0, count: 0 };
    byDay[date].revenue += o.totalAmount || 0;
    byDay[date].count += 1;
  });

  const revenueByDay = Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14);

  const topDay = revenueByDay.length > 0
    ? revenueByDay.reduce((max, d) => d.revenue > max.revenue ? d : max, revenueByDay[0]).date
    : '-';

  return { totalOrders: orders.length, totalRevenue, avgOrderValue, ordersByStatus, revenueByDay, topDay };
}

const statusLabels: Record<string, string> = {
  PENDING: '대기', CONFIRMED: '확인', SHIPPED: '배송중', DELIVERED: '완료', CANCELLED: '취소',
  RETURN_REQUESTED: '반품요청', RETURNED: '반품완료', REFUNDED: '환불완료',
};
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500', CONFIRMED: 'bg-blue-500', SHIPPED: 'bg-purple-500',
  DELIVERED: 'bg-green-500', CANCELLED: 'bg-red-500', RETURN_REQUESTED: 'bg-orange-500',
  RETURNED: 'bg-gray-400', REFUNDED: 'bg-gray-500',
};

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    fetch(`${API_BASE}/api/orders/user/1?page=0&size=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const orders: OrderForAnalytics[] = data.content || [];
        setAnalytics(computeAnalytics(orders));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const maxRevenue = analytics ? Math.max(...analytics.revenueByDay.map(d => d.revenue), 1) : 1;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/admin" className="text-sm text-gray-700 hover:text-blue-600">관리자</a>
              <a href="/admin/orders" className="text-sm text-gray-700 hover:text-blue-600">주문</a>
              <a href="/admin/users" className="text-sm text-gray-700 hover:text-blue-600">유저</a>
              <span className="text-sm font-medium text-blue-600">분석</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">매출 분석</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500">총 주문</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{analytics?.totalOrders.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500">총 매출</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{analytics?.totalRevenue.toLocaleString()}원</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500">평균 주문 금액</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{Math.round(analytics?.avgOrderValue || 0).toLocaleString()}원</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500">최고 매출일</div>
            <div className="text-xl font-bold text-purple-600 mt-1">{analytics?.topDay}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">일별 매출 추이</h2>
              {analytics && analytics.revenueByDay.length > 0 ? (
                <div className="space-y-3">
                  {analytics.revenueByDay.map((day) => (
                    <div key={day.date} className="flex items-center gap-4">
                      <div className="w-20 text-xs text-gray-500 flex-shrink-0">{day.date}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-6 rounded-full flex items-center justify-end px-2 transition-all duration-500"
                          style={{ width: `${Math.max((day.revenue / maxRevenue) * 100, 5)}%` }}
                        >
                          <span className="text-white text-xs font-medium">{day.revenue.toLocaleString()}원</span>
                        </div>
                      </div>
                      <div className="w-12 text-xs text-gray-400 text-right">{day.count}건</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">데이터가 없습니다.</div>
              )}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">주문 상태 분포</h2>
              {analytics && Object.keys(analytics.ordersByStatus).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(analytics.ordersByStatus)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => {
                      const pct = Math.round((count / analytics.totalOrders) * 100);
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{statusLabels[status] || status}</span>
                            <span className="text-gray-500">{count}건 ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div className={`${statusColors[status] || 'bg-gray-400'} rounded-full h-3 transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">데이터가 없습니다.</div>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h3 className="font-bold text-gray-900 mb-3">관리 메뉴</h3>
              <div className="space-y-2">
                <a href="/admin/orders" className="block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition">주문 관리</a>
                <a href="/admin/users" className="block px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition">유저 관리</a>
                <a href="/admin/coupons" className="block px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm hover:bg-yellow-100 transition">쿠폰 관리</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
