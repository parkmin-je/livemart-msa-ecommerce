'use client';

import { useState, useEffect } from 'react';
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

interface AdminOrder {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  userId?: number;
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

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'badge-yellow', CONFIRMED: 'badge-blue', PAYMENT_COMPLETED: 'badge-green',
  SHIPPED: 'badge-purple', DELIVERED: 'badge-green', CANCELLED: 'badge-gray',
};

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'coupons' | 'users'>('dashboard');
  const [stats, setStats] = useState<Stats>({});
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Coupon>({
    code: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, maxUses: 100, expiresAt: '',
  });
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders/query/statistics', { credentials: 'include' }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/orders?page=0&size=20', { credentials: 'include' }).then(r => r.json()).catch(() => ({ content: [] })),
      fetch('/api/coupons', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/users', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([s, o, c, u]) => {
      setStats({ ...s, totalUsers: Array.isArray(u) ? u.length : (u.content?.length || 0) });
      setOrders(Array.isArray(o) ? o : (Array.isArray(o?.content) ? o.content : []));
      setCoupons(Array.isArray(c) ? c : (Array.isArray(c?.content) ? c.content : []));
    }).finally(() => setLoading(false));
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
    { label: '총 주문', value: stats.totalOrders?.toLocaleString() || '0', emoji: '📋', sub: `처리중 ${stats.pendingOrders || 0}건`, color: 'text-blue-600' },
    { label: '총 매출', value: `${(stats.totalRevenue || 0).toLocaleString()}원`, emoji: '💰', sub: '누적', color: 'text-green-600' },
    { label: '회원 수', value: stats.totalUsers?.toLocaleString() || '0', emoji: '👥', sub: '가입자', color: 'text-purple-600' },
    { label: '총 상품', value: stats.totalProducts?.toLocaleString() || '0', emoji: '📦', sub: '등록됨', color: 'text-orange-600' },
  ];

  const TABS = [
    { id: 'dashboard', label: '대시보드', emoji: '📊' },
    { id: 'orders', label: '주문 관리', emoji: '📋' },
    { id: 'coupons', label: '쿠폰 관리', emoji: '🎫' },
    { id: 'users', label: '회원 관리', emoji: '👥' },
  ];

  return (
    <main className="min-h-screen bg-gray-100 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">LiveMart 전체 현황을 확인하세요</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-0 mb-6 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as 'dashboard' | 'orders' | 'coupons' | 'users')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* 대시보드 */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {KPI.map(k => (
                <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="text-3xl mb-2">{k.emoji}</div>
                  <p className="text-sm text-gray-500">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 mb-4">최근 주문 (상위 5건)</h2>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-gray-900">주문 #{o.id}</span>
                      <span className={`ml-2 text-xs ${STATUS_COLOR[o.status] || 'badge-gray'}`}>{o.status}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{(o.totalAmount || 0).toLocaleString()}원</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 mb-4">빠른 액션</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setTab('coupons')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors">
                    <span className="text-2xl">🎫</span><span className="text-sm font-medium text-gray-700">쿠폰 생성</span>
                  </button>
                  <button onClick={() => router.push('/seller')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors">
                    <span className="text-2xl">📦</span><span className="text-sm font-medium text-gray-700">상품 관리</span>
                  </button>
                  <button onClick={() => setTab('orders')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors">
                    <span className="text-2xl">📋</span><span className="text-sm font-medium text-gray-700">주문 조회</span>
                  </button>
                  <button onClick={() => setTab('users')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors">
                    <span className="text-2xl">👥</span><span className="text-sm font-medium text-gray-700">회원 관리</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주문 관리 */}
        {tab === 'orders' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">주문 목록 ({orders.length}건)</h2>
            </div>
            {loading ? <div className="p-16 text-center text-gray-400">로딩중...</div> : (
              <div className="divide-y divide-gray-50">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-gray-900">주문 #{o.id}</span>
                        <span className={`text-xs ${STATUS_COLOR[o.status] || 'badge-gray'}`}>{o.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(o.createdAt).toLocaleString('ko-KR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{(o.totalAmount || 0).toLocaleString()}원</p>
                      {o.userId && <p className="text-xs text-gray-400">사용자 #{o.userId}</p>}
                    </div>
                    <button onClick={() => router.push(`/orders/${o.id}`)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
                      상세
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 쿠폰 관리 */}
        {tab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowCouponForm(!showCouponForm)} className="btn-primary px-4">
                {showCouponForm ? '취소' : '+ 쿠폰 생성'}
              </button>
            </div>

            {showCouponForm && (
              <form onSubmit={createCoupon} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                <h2 className="font-bold text-gray-900">새 쿠폰 생성</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">쿠폰 코드 *</label>
                    <input type="text" value={newCoupon.code} onChange={e => setNewCoupon(c => ({ ...c, code: e.target.value.toUpperCase() }))}
                      className="form-input" required placeholder="WELCOME10" />
                  </div>
                  <div>
                    <label className="form-label">할인 유형</label>
                    <select value={newCoupon.discountType} onChange={e => setNewCoupon(c => ({ ...c, discountType: e.target.value }))} className="form-input">
                      <option value="PERCENTAGE">퍼센트 할인 (%)</option>
                      <option value="FIXED_AMOUNT">금액 할인 (원)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">할인 값 *</label>
                    <input type="number" value={newCoupon.discountValue} onChange={e => setNewCoupon(c => ({ ...c, discountValue: Number(e.target.value) }))}
                      className="form-input" required min="1" />
                  </div>
                  <div>
                    <label className="form-label">최소 주문금액</label>
                    <input type="number" value={newCoupon.minOrderAmount} onChange={e => setNewCoupon(c => ({ ...c, minOrderAmount: Number(e.target.value) }))}
                      className="form-input" min="0" />
                  </div>
                  <div>
                    <label className="form-label">최대 사용 횟수</label>
                    <input type="number" value={newCoupon.maxUses} onChange={e => setNewCoupon(c => ({ ...c, maxUses: Number(e.target.value) }))}
                      className="form-input" min="1" />
                  </div>
                  <div>
                    <label className="form-label">만료일</label>
                    <input type="datetime-local" value={newCoupon.expiresAt} onChange={e => setNewCoupon(c => ({ ...c, expiresAt: e.target.value }))}
                      className="form-input" />
                  </div>
                </div>
                <button type="submit" disabled={savingCoupon} className="btn-primary px-6">
                  {savingCoupon ? '생성중...' : '쿠폰 생성'}
                </button>
              </form>
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">쿠폰 목록 ({coupons.length}개)</h2>
              </div>
              {coupons.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <div className="text-4xl mb-3">🎫</div>
                  <p>등록된 쿠폰이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {coupons.map((c, i) => (
                    <div key={c.id || i} className="flex items-center gap-4 p-4">
                      <div className="flex-1">
                        <p className="font-mono font-bold text-gray-900">{c.code}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`}
                          {c.minOrderAmount > 0 && ` · ${c.minOrderAmount.toLocaleString()}원 이상 사용`}
                        </p>
                      </div>
                      <span className="badge-green text-xs">사용가능</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 회원 관리 */}
        {tab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">회원 관리</h2>
            <p className="text-gray-500 text-sm">관리자 권한으로 회원을 관리할 수 있습니다</p>
            <p className="text-sm font-semibold text-gray-800 mt-2">총 회원 수: {stats.totalUsers || 0}명</p>
            <a href="/admin/users" className="inline-block mt-4 px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
              전체 회원 목록 보기 →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
