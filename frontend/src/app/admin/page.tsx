'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

interface Stats {
  totalOrders?: number;
  totalRevenue?: number;
  totalUsers?: number;
  totalProducts?: number;
  pendingOrders?: number;
  cancelledOrders?: number;
}

interface PrometheusMetrics {
  responseTime: { p50: number | null; p95: number | null; p99: number | null; unit: string };
  throughput: { ordersPerSecond: number | null; paymentsPerSecond: number | null };
  activeUsers: number | null;
  redisHitRate: number | null;
  kafkaConsumerLag: number | null;
  todayRevenue: number | null;
  collectedAt: string;
}

interface OrderItem {
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
}

interface AdminOrder {
  id: number;
  orderNumber?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  userId?: number;
  items?: OrderItem[];
}

interface Coupon {
  id?: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number;
  expiresAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', CONFIRMED: '확인', PAYMENT_COMPLETED: '결제완료',
  SHIPPED: '배송중', DELIVERED: '완료', CANCELLED: '취소',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border border-blue-200',
  PAYMENT_COMPLETED: 'bg-green-50 text-green-700 border border-green-200',
  SHIPPED: 'bg-purple-50 text-purple-700 border border-purple-200',
  DELIVERED: 'bg-green-50 text-green-700 border border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200',
};

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 p-5 animate-pulse">
      <div className="w-9 h-9 rounded bg-gray-100 mb-3" />
      <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
      <div className="h-7 w-24 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'coupons' | 'users' | 'metrics'>('dashboard');
  const [stats, setStats] = useState<Stats>({});
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Coupon>({
    code: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, maxUses: 100, expiresAt: '',
  });
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    // 주문 전체 목록으로 통계 직접 계산 (통계 API가 없거나 실패할 경우 대비)
    const computeStatsFromOrders = (orderData: AdminOrder[]) => {
      const total = orderData.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const pending = orderData.filter(o => o.status === 'PENDING').length;
      const cancelled = orderData.filter(o => o.status === 'CANCELLED').length;
      return { totalOrders: orderData.length, totalRevenue: total, pendingOrders: pending, cancelledOrders: cancelled };
    };

    // 통계 + 상품수 + 회원수 병렬 조회
    Promise.all([
      fetch('/api/orders/query/statistics', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/products?page=0&size=1', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/users/count', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      // 통계 API 실패 대비: 최근 200건으로 직접 계산
      fetch('/api/orders?page=0&size=200&sort=createdAt,desc', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, p, u, allOrdersData]) => {
      const allOrders: AdminOrder[] = Array.isArray(allOrdersData)
        ? allOrdersData
        : (allOrdersData?.content || []);
      const computed = computeStatsFromOrders(allOrders);

      setStats({
        // 통계 API 값 우선, 없으면 계산값 사용
        totalOrders: s?.totalOrders ?? (allOrdersData?.totalElements ?? computed.totalOrders),
        totalRevenue: s?.totalRevenue ?? computed.totalRevenue,
        totalProducts: p?.totalElements ?? 0,
        totalUsers: u?.count ?? u?.total ?? u?.totalUsers ?? 0,
        pendingOrders: s?.pendingOrders ?? computed.pendingOrders,
        cancelledOrders: s?.cancelledOrders ?? computed.cancelledOrders,
      });
      setStatsLoading(false);
    });

    // Fetch orders for display (recent 20)
    fetch('/api/orders?page=0&size=20&sort=createdAt,desc', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { content: [] }).catch(() => ({ content: [] }))
      .then(o => {
        setOrders(Array.isArray(o) ? o : (Array.isArray(o?.content) ? o.content : []));
        setOrdersLoading(false);
      });

    // Fetch coupons independently
    fetch('/api/coupons', { credentials: 'include' })
      .then(r => r.ok ? r.json() : []).catch(() => [])
      .then(c => {
        setCoupons(Array.isArray(c) ? c : (Array.isArray(c?.content) ? c.content : []));
        setCouponsLoading(false);
      });
  }, []);

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCoupon(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon),
      });
      if (!res.ok) throw new Error('쿠폰 생성 실패');
      const created = await res.json();
      setCoupons(prev => [created, ...prev]);
      toast.success(`쿠폰 "${newCoupon.code}" 생성 완료!`);
      setShowCouponForm(false);
      setNewCoupon({ code: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, maxUses: 100, expiresAt: '' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '오류'); }
    setSavingCoupon(false);
  };

  const KPI = [
    {
      label: '총 주문', value: stats.totalOrders?.toLocaleString() || '0',
      sub: `처리중 ${stats.pendingOrders || 0}건`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      accent: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      label: '총 매출', value: `${(stats.totalRevenue || 0).toLocaleString()}원`,
      sub: '누적 매출',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accent: 'text-green-600', bg: 'bg-green-50',
    },
    {
      label: '총 사용자', value: stats.totalUsers?.toLocaleString() || '0',
      sub: '가입 회원',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      accent: 'text-purple-600', bg: 'bg-purple-50',
    },
    {
      label: '총 상품', value: stats.totalProducts?.toLocaleString() || '0',
      sub: '등록 상품',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      accent: 'text-orange-600', bg: 'bg-orange-50',
    },
  ];

  const loadPrometheusMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch('/api/admin/metrics', { credentials: 'include' });
      if (res.ok) {
        setPrometheusMetrics(await res.json());
      }
    } catch { /* Prometheus 미연결 시 무시 */ }
    setMetricsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'metrics') {
      loadPrometheusMetrics();
      const interval = setInterval(loadPrometheusMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [tab, loadPrometheusMetrics]);

  const TABS = [
    { id: 'dashboard', label: '대시보드' },
    { id: 'orders', label: '주문 관리' },
    { id: 'coupons', label: '쿠폰 관리' },
    { id: 'users', label: '회원 관리' },
    { id: 'metrics', label: '서비스 메트릭' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav />

      {/* Admin header bar */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Admin</span>
          <span className="text-gray-700">|</span>
          <span className="text-sm text-gray-300">LiveMart 관리자 패널</span>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-112px)]">
        {/* Sidebar */}
        <aside className="w-48 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block">
          <nav className="py-4">
            <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase">메뉴</p>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'dashboard' | 'orders' | 'coupons' | 'users' | 'metrics')}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-red-50 text-red-600 border-r-2 border-red-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="mx-4 my-3 border-t border-gray-100" />
            <a href="/seller" className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              판매자 센터
            </a>
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full absolute top-[112px] z-10 bg-white border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'dashboard' | 'orders' | 'coupons' | 'users' | 'metrics')}
                className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 pb-14 md:pb-6 mt-10 md:mt-0">
          {/* 대시보드 */}
          {tab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>
                <p className="text-sm text-gray-500 mt-0.5">LiveMart 전체 현황</p>
              </div>

              {/* KPI Cards — show skeleton while loading, data when ready */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : KPI.map(k => (
                    <div key={k.label} className="bg-white border border-gray-200 p-5">
                      <div className={`inline-flex items-center justify-center w-9 h-9 rounded ${k.bg} ${k.accent} mb-3`}>
                        {k.icon}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${k.accent}`}>{k.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                    </div>
                  ))
                }
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Recent Orders */}
                <div className="bg-white border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 text-sm">최근 주문</h2>
                    <button onClick={() => setTab('orders')} className="text-xs text-red-600 hover:underline">전체보기</button>
                  </div>
                  {ordersLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex justify-between py-2">
                          <div className="space-y-1.5 flex-1 mr-4">
                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                          </div>
                          <div className="h-3 bg-gray-100 rounded w-16" />
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">주문 데이터가 없습니다</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {orders.slice(0, 5).map(o => (
                        <div key={o.id} className="flex items-start justify-between py-2.5">
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-900 truncate">{o.orderNumber || `#${o.id}`}</span>
                              <span className={`flex-shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-500'}`}>
                                {STATUS_LABEL[o.status] || o.status}
                              </span>
                            </div>
                            {o.items && o.items.length > 0 && (
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                {o.items[0].productName}{o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ''}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-gray-900 flex-shrink-0">{(o.totalAmount || 0).toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-4">빠른 액션</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: '쿠폰 관리',
                        action: () => setTab('coupons'),
                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
                      },
                      {
                        label: '상품 관리',
                        action: () => router.push('/seller'),
                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
                      },
                      {
                        label: '주문 조회',
                        action: () => setTab('orders'),
                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
                      },
                      {
                        label: '회원 관리',
                        action: () => setTab('users'),
                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                      },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex flex-col items-center gap-2 p-4 border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors group"
                      >
                        <span className="text-gray-500 group-hover:text-red-600 transition-colors">{item.icon}</span>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 주문 관리 */}
          {tab === 'orders' && (
            <div className="max-w-5xl">
              <h1 className="text-xl font-bold text-gray-900 mb-6">주문 관리</h1>
              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">주문 목록 ({orders.length}건)</span>
                </div>
                {ordersLoading ? (
                  <div className="animate-pulse divide-y divide-gray-50">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="px-5 py-4 flex gap-4">
                        <div className="h-4 bg-gray-100 rounded w-32" />
                        <div className="h-4 bg-gray-100 rounded w-40 flex-1" />
                        <div className="h-4 bg-gray-100 rounded w-16" />
                        <div className="h-4 bg-gray-100 rounded w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">주문번호</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상품</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">금액</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">날짜</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">사용자</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium text-gray-900">{o.orderNumber || `#${o.id}`}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">ID {o.id}</p>
                          </td>
                          <td className="px-5 py-3">
                            {o.items && o.items.length > 0 ? (
                              <div className="space-y-0.5">
                                <p className="text-xs text-gray-800 font-medium leading-snug line-clamp-1">{o.items[0].productName}</p>
                                {o.items.length > 1 && (
                                  <p className="text-[11px] text-gray-400">외 {o.items.length - 1}개 상품</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-500'}`}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-bold text-gray-900">{(o.totalAmount || 0).toLocaleString()}원</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString('ko-KR')}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{o.userId ? `#${o.userId}` : '-'}</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => router.push(`/orders/${o.id}`)}
                              className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              상세
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 쿠폰 관리 */}
          {tab === 'coupons' && (
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">쿠폰 관리</h1>
                <button
                  onClick={() => setShowCouponForm(!showCouponForm)}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${
                    showCouponForm
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {showCouponForm ? '취소' : '+ 쿠폰 생성'}
                </button>
              </div>

              {showCouponForm && (
                <form onSubmit={createCoupon} className="bg-white border border-gray-200 p-5 space-y-4">
                  <h2 className="font-bold text-gray-900 text-sm">새 쿠폰 생성</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">쿠폰 코드 *</label>
                      <input type="text" value={newCoupon.code}
                        onChange={e => setNewCoupon(c => ({ ...c, code: e.target.value.toUpperCase() }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500" required placeholder="WELCOME10" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">할인 유형</label>
                      <select value={newCoupon.discountType}
                        onChange={e => setNewCoupon(c => ({ ...c, discountType: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500">
                        <option value="PERCENTAGE">퍼센트 할인 (%)</option>
                        <option value="FIXED_AMOUNT">금액 할인 (원)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">할인 값 *</label>
                      <input type="number" value={newCoupon.discountValue}
                        onChange={e => setNewCoupon(c => ({ ...c, discountValue: Number(e.target.value) }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500" required min="1" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">최소 주문금액</label>
                      <input type="number" value={newCoupon.minOrderAmount}
                        onChange={e => setNewCoupon(c => ({ ...c, minOrderAmount: Number(e.target.value) }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500" min="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">최대 사용 횟수</label>
                      <input type="number" value={newCoupon.maxUses}
                        onChange={e => setNewCoupon(c => ({ ...c, maxUses: Number(e.target.value) }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500" min="1" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">만료일</label>
                      <input type="datetime-local" value={newCoupon.expiresAt}
                        onChange={e => setNewCoupon(c => ({ ...c, expiresAt: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
                    </div>
                  </div>
                  <button type="submit" disabled={savingCoupon}
                    className="px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                    {savingCoupon ? '생성중...' : '쿠폰 생성'}
                  </button>
                </form>
              )}

              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <span className="font-semibold text-gray-900 text-sm">쿠폰 목록 ({coupons.length}개)</span>
                </div>
                {couponsLoading ? (
                  <div className="animate-pulse divide-y divide-gray-50">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-5 py-4 flex gap-6">
                        <div className="h-4 bg-gray-100 rounded w-24" />
                        <div className="h-4 bg-gray-100 rounded w-20" />
                        <div className="h-4 bg-gray-100 rounded w-24" />
                      </div>
                    ))}
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="p-16 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <p className="text-sm text-gray-400">등록된 쿠폰이 없습니다</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">쿠폰 코드</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">할인</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">최소금액</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {coupons.map((c, i) => (
                        <tr key={c.id || i} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-mono font-bold text-sm text-gray-900">{c.code}</td>
                          <td className="px-5 py-3 text-sm text-gray-700">
                            {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500">
                            {c.minOrderAmount > 0 ? `${c.minOrderAmount.toLocaleString()}원 이상` : '제한없음'}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200">사용가능</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 서비스 메트릭 */}
          {tab === 'metrics' && (
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-gray-900">서비스 메트릭 (Prometheus)</h1>
                <div className="flex items-center gap-3">
                  {prometheusMetrics && (
                    <span className="text-xs text-gray-400">
                      {new Date(prometheusMetrics.collectedAt).toLocaleTimeString('ko-KR')} 기준
                    </span>
                  )}
                  <button
                    onClick={loadPrometheusMetrics}
                    disabled={metricsLoading}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {metricsLoading ? '수집중...' : '새로고침'}
                  </button>
                </div>
              </div>

              {metricsLoading && !prometheusMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : prometheusMetrics ? (
                <div className="space-y-6">
                  {/* 응답시간 */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">API 응답시간</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'P50 (중간값)', value: prometheusMetrics.responseTime.p50 },
                        { label: 'P95', value: prometheusMetrics.responseTime.p95 },
                        { label: 'P99 (최대)', value: prometheusMetrics.responseTime.p99 },
                      ].map(m => (
                        <div key={m.label} className="bg-white border border-gray-200 p-5">
                          <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                          <p className="text-2xl font-black text-gray-900">
                            {m.value !== null ? `${m.value}ms` : 'N/A'}
                          </p>
                          {m.value !== null && m.value > 500 && (
                            <p className="text-xs text-red-500 mt-1 font-semibold">응답 지연 경고</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 처리량 */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">초당 처리량</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">주문 생성 (req/s)</p>
                        <p className="text-2xl font-black text-gray-900">
                          {prometheusMetrics.throughput.ordersPerSecond !== null
                            ? prometheusMetrics.throughput.ordersPerSecond.toFixed(2)
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">결제 처리 (req/s)</p>
                        <p className="text-2xl font-black text-gray-900">
                          {prometheusMetrics.throughput.paymentsPerSecond !== null
                            ? prometheusMetrics.throughput.paymentsPerSecond.toFixed(2)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 인프라 상태 */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">인프라 상태</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">Redis 히트율</p>
                        <p className="text-2xl font-black text-gray-900">
                          {prometheusMetrics.redisHitRate !== null ? `${prometheusMetrics.redisHitRate}%` : 'N/A'}
                        </p>
                        {prometheusMetrics.redisHitRate !== null && prometheusMetrics.redisHitRate < 80 && (
                          <p className="text-xs text-orange-500 mt-1 font-semibold">히트율 낮음</p>
                        )}
                      </div>
                      <div className="bg-white border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">Kafka 컨슈머 랙</p>
                        <p className="text-2xl font-black text-gray-900">
                          {prometheusMetrics.kafkaConsumerLag !== null ? prometheusMetrics.kafkaConsumerLag : 'N/A'}
                        </p>
                        {prometheusMetrics.kafkaConsumerLag !== null && prometheusMetrics.kafkaConsumerLag > 1000 && (
                          <p className="text-xs text-red-500 mt-1 font-semibold">처리 지연 경고</p>
                        )}
                      </div>
                      <div className="bg-white border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">오늘 매출</p>
                        <p className="text-2xl font-black text-gray-900">
                          {prometheusMetrics.todayRevenue !== null
                            ? `${prometheusMetrics.todayRevenue.toLocaleString()}원`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 text-sm">Prometheus에 연결할 수 없습니다.</p>
                  <p className="text-gray-400 text-xs mt-1">PROMETHEUS_URL 환경변수를 확인하세요.</p>
                </div>
              )}
            </div>
          )}

          {/* 회원 관리 */}
          {tab === 'users' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-gray-900 mb-6">회원 관리</h1>
              <div className="bg-white border border-gray-200 p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-base font-bold text-gray-900 mb-1">회원 관리</h2>
                <p className="text-gray-500 text-sm">관리자 권한으로 회원을 관리할 수 있습니다</p>
                <p className="text-sm font-semibold text-gray-800 mt-2">
                  총 회원 수: {statsLoading ? '...' : `${stats.totalUsers || 0}명`}
                </p>
                <a href="/admin/users"
                  className="inline-block mt-4 px-5 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                  전체 회원 목록 보기
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
