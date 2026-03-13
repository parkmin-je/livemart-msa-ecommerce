'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

interface DashboardData {
  totalRevenue?: number;
  totalOrders?: number;
  totalProducts?: number;
  pendingOrders?: number;
  recentOrders?: Array<{ id: number; status: string; totalAmount: number; createdAt: string }>;
  lowStockProducts?: Array<{ id: number; name: string; stockQuantity: number }>;
}

interface NewProduct {
  name: string; description: string; price: string; stockQuantity: string; categoryId: string; imageUrl: string;
}

interface AiDescription {
  oneLiner: string;
  bodyText: string;
  seoTags: string[];
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

export default function SellerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'products' | 'orders'>('dashboard');
  const [data, setData] = useState<DashboardData>({});
  const [products, setProducts] = useState<Array<{ id: number; name: string; price: number; stockQuantity: number; categoryId?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({ name: '', description: '', price: '', stockQuantity: '', categoryId: '1', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDesc, setAiDesc] = useState<AiDescription | null>(null);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    Promise.all([
      fetch(`/api/sellers/${userId || 1}/dashboard`, { credentials: 'include' }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/products?page=0&size=50', { credentials: 'include' }).then(r => r.json()).catch(() => ({ content: [] })),
    ]).then(([dash, prods]) => {
      setData(dash);
      setProducts(prods.content || []);
    }).finally(() => setLoading(false));
  }, []);

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name, description: newProduct.description,
          price: Number(newProduct.price), stockQuantity: Number(newProduct.stockQuantity),
          categoryId: Number(newProduct.categoryId),
          imageUrl: newProduct.imageUrl || `https://picsum.photos/seed/${Date.now()}/400/400`,
        }),
      });
      if (!res.ok) throw new Error('등록 실패');
      const created = await res.json();
      setProducts(prev => [created, ...prev]);
      toast.success('상품이 등록되었습니다!');
      setShowForm(false);
      setNewProduct({ name: '', description: '', price: '', stockQuantity: '', categoryId: '1', imageUrl: '' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '오류'); }
    setSaving(false);
  };

  const generateAiDescription = async () => {
    if (!newProduct.name.trim()) { toast.error('상품명을 먼저 입력하세요'); return; }
    setAiGenerating(true);
    setAiDesc(null);
    try {
      const res = await fetch('/api/ai/description', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: newProduct.name,
          keywords: newProduct.name.split(' ').filter(Boolean),
          tone: 'professional',
        }),
      });
      if (!res.ok) throw new Error('AI 서비스 연결 실패');
      const data: AiDescription = await res.json();
      setAiDesc(data);
      setNewProduct(p => ({ ...p, description: `${data.oneLiner}\n\n${data.bodyText}` }));
      toast.success('자동 설명이 생성되었습니다');
    } catch { toast.error('설명 생성 실패. 직접 입력해주세요.'); }
    setAiGenerating(false);
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('상품을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('삭제됐습니다');
    } catch { toast.error('삭제 실패'); }
  };

  const TABS = [
    { id: 'dashboard', label: '대시보드' },
    { id: 'products', label: '상품 관리' },
    { id: 'orders', label: '주문 관리' },
  ];

  const KPI = [
    {
      label: '총 매출', value: `${(data.totalRevenue || 0).toLocaleString()}원`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      accent: 'text-green-600', bg: 'bg-green-50',
    },
    {
      label: '총 주문', value: `${(data.totalOrders || 0).toLocaleString()}건`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      accent: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      label: '등록 상품', value: `${(data.totalProducts || 0).toLocaleString()}개`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      accent: 'text-purple-600', bg: 'bg-purple-50',
    },
    {
      label: '처리 대기', value: `${(data.pendingOrders || 0).toLocaleString()}건`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      accent: 'text-red-600', bg: 'bg-red-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav />

      {/* Seller header bar */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Seller</span>
          <span className="text-gray-700">|</span>
          <span className="text-sm text-gray-300">판매자 센터</span>
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
                onClick={() => {
                  setTab(t.id as 'dashboard' | 'products' | 'orders');
                  if (t.id === 'products') setShowForm(false);
                }}
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
            <a href="/seller/inventory" className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              재고 관리
            </a>
            <a href="/admin" className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              관리자 패널
            </a>
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full absolute top-[112px] z-10 bg-white border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'dashboard' | 'products' | 'orders')}
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
        <main className="flex-1 p-6 pb-14 md:pb-6 mt-10 md:mt-0 overflow-x-auto">
          {/* 대시보드 */}
          {tab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h1 className="text-xl font-bold text-gray-900">판매자 대시보드</h1>
                <p className="text-sm text-gray-500 mt-0.5">판매 현황을 확인하세요</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {KPI.map(k => (
                  <div key={k.label} className="bg-white border border-gray-200 p-5">
                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded ${k.bg} ${k.accent} mb-3`}>
                      {k.icon}
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                    <p className={`text-xl font-bold mt-1 ${k.accent}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: '상품 등록',
                    action: () => { setTab('products'); setShowForm(true); },
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>,
                  },
                  {
                    label: '재고 관리',
                    action: () => router.push('/seller/inventory'),
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
                  },
                  {
                    label: '주문 확인',
                    action: () => setTab('orders'),
                    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
                  },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors group"
                  >
                    <span className="text-gray-500 group-hover:text-red-600 transition-colors">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Low stock warning */}
                {data.lowStockProducts && data.lowStockProducts.length > 0 && (
                  <div className="bg-white border border-orange-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h2 className="font-bold text-orange-700 text-sm">재고 부족 상품</h2>
                    </div>
                    <div className="space-y-2">
                      {data.lowStockProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-sm font-medium text-gray-900">{p.name}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200">재고 {p.stockQuantity}개</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent orders */}
                <div className="bg-white border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 text-sm">최근 주문</h2>
                    <button onClick={() => setTab('orders')} className="text-xs text-red-600 hover:underline">전체보기</button>
                  </div>
                  {(data.recentOrders || []).length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-6">최근 주문이 없습니다</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {(data.recentOrders || []).slice(0, 5).map(o => (
                        <div key={o.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <span className="text-sm font-medium text-gray-900">주문 #{o.id}</span>
                            <span className={`ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-500'}`}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{o.totalAmount.toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 상품 관리 */}
          {tab === 'products' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">상품 관리</h1>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${
                    showForm
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {showForm ? '취소' : '+ 상품 등록'}
                </button>
              </div>

              {/* 상품 등록 폼 */}
              {showForm && (
                <form onSubmit={saveProduct} className="bg-white border border-gray-200 p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-4">새 상품 등록</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">상품명 *</label>
                      <input type="text" value={newProduct.name}
                        onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        required placeholder="상품명을 입력하세요" />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-600">상품 설명</label>
                        <button
                          type="button"
                          onClick={generateAiDescription}
                          disabled={aiGenerating}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1 transition-colors disabled:opacity-50"
                        >
                          <svg className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          {aiGenerating ? '생성중...' : '자동 설명 생성'}
                        </button>
                      </div>
                      <textarea
                        value={newProduct.description}
                        onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
                        rows={4} placeholder="상품 설명을 입력하거나 자동 생성을 사용하세요"
                      />
                      {aiDesc && (
                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200">
                          <p className="text-[11px] font-semibold text-gray-600 mb-1.5">SEO 태그</p>
                          <div className="flex flex-wrap gap-1">
                            {aiDesc.seoTags.map((tag, i) => (
                              <span key={i} className="text-[10px] bg-white text-gray-600 border border-gray-300 px-2 py-0.5">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">가격 (원) *</label>
                      <input type="number" value={newProduct.price}
                        onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        required min="0" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">재고 수량 *</label>
                      <input type="number" value={newProduct.stockQuantity}
                        onChange={e => setNewProduct(p => ({ ...p, stockQuantity: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        required min="0" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">카테고리</label>
                      <select value={newProduct.categoryId}
                        onChange={e => setNewProduct(p => ({ ...p, categoryId: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white">
                        <option value="1">전자기기</option>
                        <option value="2">패션</option>
                        <option value="3">식품</option>
                        <option value="4">홈/리빙</option>
                        <option value="5">뷰티</option>
                        <option value="6">스포츠</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">이미지 URL</label>
                      <input type="url" value={newProduct.imageUrl}
                        onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button type="submit" disabled={saving}
                      className="px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                      {saving ? '등록중...' : '등록하기'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                      취소
                    </button>
                  </div>
                </form>
              )}

              {/* 상품 목록 */}
              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <span className="font-semibold text-gray-900 text-sm">상품 목록 ({products.length}개)</span>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-gray-400 text-sm">불러오는 중...</div>
                ) : products.length === 0 ? (
                  <div className="p-16 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-sm text-gray-400">등록된 상품이 없습니다</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상품명</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">가격</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">재고</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-700">{p.price.toLocaleString()}원</td>
                          <td className="px-5 py-3 text-sm text-gray-700">{p.stockQuantity}개</td>
                          <td className="px-5 py-3">
                            {p.stockQuantity === 0
                              ? <span className="text-[11px] font-semibold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200">품절</span>
                              : p.stockQuantity <= 10
                              ? <span className="text-[11px] font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200">재고부족</span>
                              : <span className="text-[11px] font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200">판매중</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => router.push(`/products/${p.id}`)}
                                className="px-2.5 py-1 border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                                보기
                              </button>
                              <button onClick={() => deleteProduct(p.id)}
                                className="px-2.5 py-1 border border-red-200 text-xs text-red-600 hover:bg-red-50 transition-colors">
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 주문 관리 */}
          {tab === 'orders' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-gray-900 mb-6">주문 관리</h1>
              <div className="bg-white border border-gray-200 p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h2 className="text-base font-bold text-gray-900 mb-1">주문 관리</h2>
                <p className="text-gray-500 text-sm">판매자용 주문 관리 기능입니다</p>
                <button onClick={() => router.push('/my-orders')}
                  className="mt-4 px-5 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                  주문 목록 보기
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
