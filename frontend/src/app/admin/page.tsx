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

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDING:           { background: 'rgba(234,179,8,0.08)',  color: 'rgb(161,98,7)',   border: '1px solid rgba(234,179,8,0.2)' },
  CONFIRMED:         { background: 'rgba(37,99,235,0.08)',  color: 'rgb(29,78,216)',  border: '1px solid rgba(37,99,235,0.2)' },
  PAYMENT_COMPLETED: { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)',   border: '1px solid rgba(16,185,129,0.2)' },
  SHIPPED:           { background: 'rgba(147,51,234,0.08)', color: 'rgb(109,40,217)', border: '1px solid rgba(147,51,234,0.2)' },
  DELIVERED:         { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)',   border: '1px solid rgba(16,185,129,0.2)' },
  CANCELLED:         { background: 'rgba(14,14,14,0.06)',   color: 'rgba(14,14,14,0.45)', border: '1px solid rgba(14,14,14,0.12)' },
};

function SkeletonCard() {
  return (
    <div className="p-5 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
      <div className="w-9 h-9 mb-3" style={{ background: '#EDEBE4' }} />
      <div className="h-3 w-16 mb-2" style={{ background: '#EDEBE4' }} />
      <div className="h-7 w-24 mb-2" style={{ background: '#EDEBE4' }} />
      <div className="h-3 w-20" style={{ background: '#EDEBE4' }} />
    </div>
  );
}

const inputStyle: React.CSSProperties = { border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' };
const labelStyle: React.CSSProperties = { color: 'rgba(14,14,14,0.6)' };

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
    const computeStatsFromOrders = (orderData: AdminOrder[]) => {
      const total = orderData.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const pending = orderData.filter(o => o.status === 'PENDING').length;
      const cancelled = orderData.filter(o => o.status === 'CANCELLED').length;
      return { totalOrders: orderData.length, totalRevenue: total, pendingOrders: pending, cancelledOrders: cancelled };
    };

    Promise.all([
      fetch('/api/orders/query/statistics', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/products?page=0&size=1', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/users/count', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/orders?page=0&size=200&sort=createdAt,desc', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, p, u, allOrdersData]) => {
      const allOrders: AdminOrder[] = Array.isArray(allOrdersData)
        ? allOrdersData
        : (allOrdersData?.content || []);
      const computed = computeStatsFromOrders(allOrders);
      setStats({
        totalOrders: s?.totalOrders ?? (allOrdersData?.totalElements ?? computed.totalOrders),
        totalRevenue: s?.totalRevenue ?? computed.totalRevenue,
        totalProducts: p?.totalElements ?? 0,
        totalUsers: u?.count ?? u?.total ?? u?.totalUsers ?? 0,
        pendingOrders: s?.pendingOrders ?? computed.pendingOrders,
        cancelledOrders: s?.cancelledOrders ?? computed.cancelledOrders,
      });
      setStatsLoading(false);
    });

    fetch('/api/orders?page=0&size=20&sort=createdAt,desc', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { content: [] }).catch(() => ({ content: [] }))
      .then(o => {
        setOrders(Array.isArray(o) ? o : (Array.isArray(o?.content) ? o.content : []));
        setOrdersLoading(false);
      });

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
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      accent: 'rgb(29,78,216)', bg: 'rgba(37,99,235,0.08)',
    },
    {
      label: '총 매출', value: `${(stats.totalRevenue || 0).toLocaleString()}원`,
      sub: '누적 매출',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      accent: 'rgb(4,120,87)', bg: 'rgba(16,185,129,0.08)',
    },
    {
      label: '총 사용자', value: stats.totalUsers?.toLocaleString() || '0',
      sub: '가입 회원',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      accent: 'rgb(109,40,217)', bg: 'rgba(147,51,234,0.08)',
    },
    {
      label: '총 상품', value: stats.totalProducts?.toLocaleString() || '0',
      sub: '등록 상품',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      accent: 'rgb(194,65,12)', bg: 'rgba(234,88,12,0.08)',
    },
  ];

  const loadPrometheusMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch('/api/admin/metrics', { credentials: 'include' });
      if (res.ok) setPrometheusMetrics(await res.json());
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

  const setTabTyped = (id: string) => setTab(id as 'dashboard' | 'orders' | 'coupons' | 'users' | 'metrics');

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      {/* Admin header bar */}
      <div className="text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Admin</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>LiveMart 관리자 패널</span>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-112px)]">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block" style={{ background: '#FFFFFF', borderRight: '1px solid rgba(14,14,14,0.07)' }}>
          <nav className="py-4">
            <p className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(14,14,14,0.4)' }}>메뉴</p>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTabTyped(t.id)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors"
                style={tab === t.id
                  ? { background: 'rgba(232,0,29,0.06)', color: '#E8001D', borderRight: '2px solid #E8001D' }
                  : { color: 'rgba(14,14,14,0.6)' }}
                onMouseEnter={e => tab !== t.id && (e.currentTarget.style.background = '#F7F6F1')}
                onMouseLeave={e => tab !== t.id && (e.currentTarget.style.background = 'transparent')}
              >
                {t.label}
              </button>
            ))}
            <div className="mx-4 my-3" style={{ borderTop: '1px solid rgba(14,14,14,0.08)' }} />
            <a href="/seller" className="block px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ color: 'rgba(14,14,14,0.6)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F7F6F1'; e.currentTarget.style.color = '#0E0E0E'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(14,14,14,0.6)'; }}>
              판매자 센터
            </a>
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full absolute top-[112px] z-10" style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
          <div className="flex overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTabTyped(t.id)}
                className="flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors"
                style={tab === t.id
                  ? { borderColor: '#E8001D', color: '#E8001D' }
                  : { borderColor: 'transparent', color: 'rgba(14,14,14,0.5)' }}
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
                <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>관리자 대시보드</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>LiveMart 전체 현황</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : KPI.map(k => (
                    <div key={k.label} className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                      <div className="inline-flex items-center justify-center w-9 h-9 mb-3" style={{ background: k.bg, color: k.accent }}>
                        {k.icon}
                      </div>
                      <p className="text-xs font-medium" style={{ color: 'rgba(14,14,14,0.5)' }}>{k.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: k.accent }}>{k.value}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(14,14,14,0.4)' }}>{k.sub}</p>
                    </div>
                  ))
                }
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Recent Orders */}
                <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm" style={{ color: '#0E0E0E' }}>최근 주문</h2>
                    <button onClick={() => setTab('orders')} className="text-xs text-red-600 hover:underline">전체보기</button>
                  </div>
                  {ordersLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex justify-between py-2">
                          <div className="space-y-1.5 flex-1 mr-4">
                            <div className="h-3 rounded w-3/4" style={{ background: '#EDEBE4' }} />
                            <div className="h-3 rounded w-1/2" style={{ background: '#EDEBE4' }} />
                          </div>
                          <div className="h-3 rounded w-16" style={{ background: '#EDEBE4' }} />
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-center text-sm py-8" style={{ color: 'rgba(14,14,14,0.4)' }}>주문 데이터가 없습니다</p>
                  ) : (
                    <div>
                      {orders.slice(0, 5).map(o => (
                        <div key={o.id} className="flex items-start justify-between py-2.5" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}>
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate" style={{ color: '#0E0E0E' }}>{o.orderNumber || `#${o.id}`}</span>
                              <span className="flex-shrink-0 text-[11px] font-medium px-1.5 py-0.5" style={STATUS_STYLE[o.status] || STATUS_STYLE.CANCELLED}>
                                {STATUS_LABEL[o.status] || o.status}
                              </span>
                            </div>
                            {o.items && o.items.length > 0 && (
                              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(14,14,14,0.4)' }}>
                                {o.items[0].productName}{o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ''}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-bold flex-shrink-0" style={{ color: '#0E0E0E' }}>{(o.totalAmount || 0).toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <h2 className="font-bold text-sm mb-4" style={{ color: '#0E0E0E' }}>빠른 액션</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '쿠폰 관리', action: () => setTab('coupons'), icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> },
                      { label: '상품 관리', action: () => router.push('/seller'), icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                      { label: '주문 조회', action: () => setTab('orders'), icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
                      { label: '회원 관리', action: () => setTab('users'), icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex flex-col items-center gap-2 p-4 transition-colors group"
                        style={{ border: '1px solid rgba(14,14,14,0.1)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,0,29,0.3)'; e.currentTarget.style.background = 'rgba(232,0,29,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(14,14,14,0.1)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span className="transition-colors" style={{ color: 'rgba(14,14,14,0.5)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#E8001D')}>{item.icon}</span>
                        <span className="text-sm font-medium" style={{ color: 'rgba(14,14,14,0.7)' }}>{item.label}</span>
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
              <h1 className="text-xl font-bold mb-6" style={{ color: '#0E0E0E' }}>주문 관리</h1>
              <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
                  <span className="font-semibold text-sm" style={{ color: '#0E0E0E' }}>주문 목록 ({orders.length}건)</span>
                </div>
                {ordersLoading ? (
                  <div className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="px-5 py-4 flex gap-4" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}>
                        <div className="h-4 rounded w-32" style={{ background: '#EDEBE4' }} />
                        <div className="h-4 rounded w-40 flex-1" style={{ background: '#EDEBE4' }} />
                        <div className="h-4 rounded w-16" style={{ background: '#EDEBE4' }} />
                        <div className="h-4 rounded w-20" style={{ background: '#EDEBE4' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#F7F6F1', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
                        {['주문번호','상품','상태','금액','날짜','사용자',''].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(14,14,14,0.5)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium" style={{ color: '#0E0E0E' }}>{o.orderNumber || `#${o.id}`}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(14,14,14,0.4)' }}>ID {o.id}</p>
                          </td>
                          <td className="px-5 py-3">
                            {o.items && o.items.length > 0 ? (
                              <div className="space-y-0.5">
                                <p className="text-xs font-medium leading-snug line-clamp-1" style={{ color: 'rgba(14,14,14,0.8)' }}>{o.items[0].productName}</p>
                                {o.items.length > 1 && (
                                  <p className="text-[11px]" style={{ color: 'rgba(14,14,14,0.4)' }}>외 {o.items.length - 1}개 상품</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>-</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5" style={STATUS_STYLE[o.status] || STATUS_STYLE.CANCELLED}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-bold" style={{ color: '#0E0E0E' }}>{(o.totalAmount || 0).toLocaleString()}원</td>
                          <td className="px-5 py-3 text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>{new Date(o.createdAt).toLocaleDateString('ko-KR')}</td>
                          <td className="px-5 py-3 text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>{o.userId ? `#${o.userId}` : '-'}</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => router.push(`/orders/${o.id}`)}
                              className="text-xs px-3 py-1.5 transition-colors"
                              style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.6)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>쿠폰 관리</h1>
                <button
                  onClick={() => setShowCouponForm(!showCouponForm)}
                  className="px-4 py-2 text-sm font-semibold transition-colors"
                  style={showCouponForm
                    ? { border: '1px solid rgba(14,14,14,0.2)', color: 'rgba(14,14,14,0.6)' }
                    : { background: '#E8001D', color: '#FFFFFF' }}
                  onMouseEnter={e => showCouponForm
                    ? (e.currentTarget.style.background = '#F7F6F1')
                    : (e.currentTarget.style.background = '#C8001A')}
                  onMouseLeave={e => showCouponForm
                    ? (e.currentTarget.style.background = 'transparent')
                    : (e.currentTarget.style.background = '#E8001D')}
                >
                  {showCouponForm ? '취소' : '+ 쿠폰 생성'}
                </button>
              </div>

              {showCouponForm && (
                <form onSubmit={createCoupon} className="p-5 space-y-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <h2 className="font-bold text-sm" style={{ color: '#0E0E0E' }}>새 쿠폰 생성</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>쿠폰 코드 *</label>
                      <input type="text" value={newCoupon.code}
                        onChange={e => setNewCoupon(c => ({ ...c, code: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} required placeholder="WELCOME10" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>할인 유형</label>
                      <select value={newCoupon.discountType}
                        onChange={e => setNewCoupon(c => ({ ...c, discountType: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                        <option value="PERCENTAGE">퍼센트 할인 (%)</option>
                        <option value="FIXED_AMOUNT">금액 할인 (원)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>할인 값 *</label>
                      <input type="number" value={newCoupon.discountValue}
                        onChange={e => setNewCoupon(c => ({ ...c, discountValue: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} required min="1" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>최소 주문금액</label>
                      <input type="number" value={newCoupon.minOrderAmount}
                        onChange={e => setNewCoupon(c => ({ ...c, minOrderAmount: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} min="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>최대 사용 횟수</label>
                      <input type="number" value={newCoupon.maxUses}
                        onChange={e => setNewCoupon(c => ({ ...c, maxUses: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} min="1" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>만료일</label>
                      <input type="datetime-local" value={newCoupon.expiresAt}
                        onChange={e => setNewCoupon(c => ({ ...c, expiresAt: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                    </div>
                  </div>
                  <button type="submit" disabled={savingCoupon}
                    className="px-6 py-2 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ background: '#E8001D' }}
                    onMouseEnter={e => !savingCoupon && (e.currentTarget.style.background = '#C8001A')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}>
                    {savingCoupon ? '생성중...' : '쿠폰 생성'}
                  </button>
                </form>
              )}

              <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
                  <span className="font-semibold text-sm" style={{ color: '#0E0E0E' }}>쿠폰 목록 ({coupons.length}개)</span>
                </div>
                {couponsLoading ? (
                  <div className="animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-5 py-4 flex gap-6" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}>
                        <div className="h-4 rounded w-24" style={{ background: '#EDEBE4' }} />
                        <div className="h-4 rounded w-20" style={{ background: '#EDEBE4' }} />
                        <div className="h-4 rounded w-24" style={{ background: '#EDEBE4' }} />
                      </div>
                    ))}
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="p-16 text-center">
                    <svg className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(14,14,14,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <p className="text-sm" style={{ color: 'rgba(14,14,14,0.4)' }}>등록된 쿠폰이 없습니다</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#F7F6F1', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
                        {['쿠폰 코드','할인','최소금액','상태'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgba(14,14,14,0.5)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((c, i) => (
                        <tr key={c.id || i} className="transition-colors" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-5 py-3 font-mono font-bold text-sm" style={{ color: '#0E0E0E' }}>{c.code}</td>
                          <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.7)' }}>
                            {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`}
                          </td>
                          <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>
                            {c.minOrderAmount > 0 ? `${c.minOrderAmount.toLocaleString()}원 이상` : '제한없음'}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)', border: '1px solid rgba(16,185,129,0.2)' }}>사용가능</span>
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
                <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>서비스 메트릭 (Prometheus)</h1>
                <div className="flex items-center gap-3">
                  {prometheusMetrics && (
                    <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>
                      {new Date(prometheusMetrics.collectedAt).toLocaleTimeString('ko-KR')} 기준
                    </span>
                  )}
                  <button
                    onClick={loadPrometheusMetrics}
                    disabled={metricsLoading}
                    className="px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: '#0A0A0A' }}
                    onMouseEnter={e => !metricsLoading && (e.currentTarget.style.background = '#E8001D')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
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
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(14,14,14,0.6)' }}>API 응답시간</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'P50 (중간값)', value: prometheusMetrics.responseTime.p50 },
                        { label: 'P95', value: prometheusMetrics.responseTime.p95 },
                        { label: 'P99 (최대)', value: prometheusMetrics.responseTime.p99 },
                      ].map(m => (
                        <div key={m.label} className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                          <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>{m.label}</p>
                          <p className="text-2xl font-black" style={{ color: '#0E0E0E' }}>
                            {m.value !== null ? `${m.value}ms` : 'N/A'}
                          </p>
                          {m.value !== null && m.value > 500 && (
                            <p className="text-xs text-red-500 mt-1 font-semibold">응답 지연 경고</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(14,14,14,0.6)' }}>초당 처리량</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                        <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>주문 생성 (req/s)</p>
                        <p className="text-2xl font-black" style={{ color: '#0E0E0E' }}>
                          {prometheusMetrics.throughput.ordersPerSecond !== null ? prometheusMetrics.throughput.ordersPerSecond.toFixed(2) : 'N/A'}
                        </p>
                      </div>
                      <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                        <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>결제 처리 (req/s)</p>
                        <p className="text-2xl font-black" style={{ color: '#0E0E0E' }}>
                          {prometheusMetrics.throughput.paymentsPerSecond !== null ? prometheusMetrics.throughput.paymentsPerSecond.toFixed(2) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(14,14,14,0.6)' }}>인프라 상태</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                        <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>Redis 히트율</p>
                        <p className="text-2xl font-black" style={{ color: '#0E0E0E' }}>
                          {prometheusMetrics.redisHitRate !== null ? `${prometheusMetrics.redisHitRate}%` : 'N/A'}
                        </p>
                        {prometheusMetrics.redisHitRate !== null && prometheusMetrics.redisHitRate < 80 && (
                          <p className="text-xs text-orange-500 mt-1 font-semibold">히트율 낮음</p>
                        )}
                      </div>
                      <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                        <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>Kafka 컨슈머 랙</p>
                        <p className="text-2xl font-black" style={{ color: '#0E0E0E' }}>
                          {prometheusMetrics.kafkaConsumerLag !== null ? prometheusMetrics.kafkaConsumerLag : 'N/A'}
                        </p>
                        {prometheusMetrics.kafkaConsumerLag !== null && prometheusMetrics.kafkaConsumerLag > 1000 && (
                          <p className="text-xs text-red-500 mt-1 font-semibold">처리 지연 경고</p>
                        )}
                      </div>
                      <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                        <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>오늘 매출</p>
                        <p className="text-2xl font-black" style={{ color: '#0E0E0E' }}>
                          {prometheusMetrics.todayRevenue !== null ? `${prometheusMetrics.todayRevenue.toLocaleString()}원` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>Prometheus에 연결할 수 없습니다.</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(14,14,14,0.4)' }}>PROMETHEUS_URL 환경변수를 확인하세요.</p>
                </div>
              )}
            </div>
          )}

          {/* 회원 관리 */}
          {tab === 'users' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold mb-6" style={{ color: '#0E0E0E' }}>회원 관리</h1>
              <div className="p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-base font-bold mb-1" style={{ color: '#0E0E0E' }}>회원 관리</h2>
                <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>관리자 권한으로 회원을 관리할 수 있습니다</p>
                <p className="text-sm font-semibold mt-2" style={{ color: 'rgba(14,14,14,0.7)' }}>
                  총 회원 수: {statsLoading ? '...' : `${stats.totalUsers || 0}명`}
                </p>
                <a href="/admin/users"
                  className="inline-block mt-4 px-5 py-2 text-white text-sm font-semibold transition-colors"
                  style={{ background: '#E8001D' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#C8001A')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}>
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
