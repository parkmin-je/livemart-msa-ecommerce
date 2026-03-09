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

const KPI_CARDS = (d: DashboardData) => [
  { label: '총 매출', value: `${(d.totalRevenue || 0).toLocaleString()}원`, emoji: '💰', color: 'bg-green-50 border-green-200 text-green-700' },
  { label: '총 주문', value: `${(d.totalOrders || 0).toLocaleString()}건`, emoji: '📋', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { label: '등록 상품', value: `${(d.totalProducts || 0).toLocaleString()}개`, emoji: '📦', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { label: '처리 대기', value: `${(d.pendingOrders || 0).toLocaleString()}건`, emoji: '⏳', color: 'bg-red-50 border-red-200 text-red-700' },
];

export default function SellerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'products' | 'orders'>('dashboard');
  const [data, setData] = useState<DashboardData>({});
  const [products, setProducts] = useState<Array<{ id: number; name: string; price: number; stockQuantity: number; categoryId?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({ name: '', description: '', price: '', stockQuantity: '', categoryId: '1', imageUrl: '' });
  const [saving, setSaving] = useState(false);

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

  const deleteProduct = async (id: number) => {
    if (!confirm('상품을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('삭제됐습니다');
    } catch { toast.error('삭제 실패'); }
  };

  const TABS = [
    { id: 'dashboard', label: '대시보드', emoji: '📊' },
    { id: 'products', label: '상품 관리', emoji: '📦' },
    { id: 'orders', label: '주문 관리', emoji: '📋' },
  ];

  return (
    <main className="min-h-screen bg-gray-100 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">판매자 센터</h1>
            <p className="text-sm text-gray-500 mt-1">상품과 주문을 관리하세요</p>
          </div>
          <div className="flex gap-2">
            {tab === 'products' && (
              <button onClick={() => setShowForm(!showForm)} className="btn-primary px-4">
                {showForm ? '취소' : '+ 상품 등록'}
              </button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as 'dashboard' | 'products' | 'orders')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>

        {/* 대시보드 */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {KPI_CARDS(data).map(kpi => (
                <div key={kpi.label} className={`rounded-xl border p-5 ${kpi.color}`}>
                  <div className="text-2xl mb-2">{kpi.emoji}</div>
                  <p className="text-sm font-medium opacity-70">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>

            {data.lowStockProducts && data.lowStockProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-orange-200 p-5">
                <h2 className="font-bold text-orange-700 mb-3">⚠️ 재고 부족 상품</h2>
                <div className="space-y-2">
                  {data.lowStockProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{p.name}</span>
                      <span className="badge-red text-xs">재고 {p.stockQuantity}개</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">최근 주문</h2>
              {(data.recentOrders || []).length === 0 ? (
                <p className="text-center text-gray-400 py-8">최근 주문이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {(data.recentOrders || []).slice(0, 5).map(o => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">주문 #{o.id}</span>
                      <span className="text-sm font-bold text-gray-900">{o.totalAmount.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 상품 관리 */}
        {tab === 'products' && (
          <div className="space-y-4">
            {/* 상품 등록 폼 */}
            {showForm && (
              <form onSubmit={saveProduct} className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 text-lg mb-4">새 상품 등록</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="form-label">상품명 *</label>
                    <input type="text" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                      className="form-input" required placeholder="상품명을 입력하세요" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">상품 설명</label>
                    <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                      className="form-input resize-none" rows={3} placeholder="상품 설명을 입력하세요" />
                  </div>
                  <div>
                    <label className="form-label">가격 (원) *</label>
                    <input type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                      className="form-input" required min="0" placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label">재고 수량 *</label>
                    <input type="number" value={newProduct.stockQuantity} onChange={e => setNewProduct(p => ({ ...p, stockQuantity: e.target.value }))}
                      className="form-input" required min="0" placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label">카테고리</label>
                    <select value={newProduct.categoryId} onChange={e => setNewProduct(p => ({ ...p, categoryId: e.target.value }))} className="form-input">
                      <option value="1">전자기기</option>
                      <option value="2">패션</option>
                      <option value="3">식품</option>
                      <option value="4">홈/리빙</option>
                      <option value="5">뷰티</option>
                      <option value="6">스포츠</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">이미지 URL</label>
                    <input type="url" value={newProduct.imageUrl} onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))}
                      className="form-input" placeholder="https://..." />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={saving} className="btn-primary px-6">{saving ? '등록중...' : '등록하기'}</button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">취소</button>
                </div>
              </form>
            )}

            {/* 상품 목록 */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">상품 목록 ({products.length}개)</h2>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400">로딩중...</div>
              ) : products.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <div className="text-5xl mb-3">📦</div>
                  <p>등록된 상품이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-xl">📦</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-sm text-gray-500">{p.price.toLocaleString()}원 · 재고 {p.stockQuantity}개</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => router.push(`/products/${p.id}`)}
                          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">보기</button>
                        <button onClick={() => deleteProduct(p.id)}
                          className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors">삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 주문 관리 */}
        {tab === 'orders' && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">주문 관리</h2>
            <p className="text-gray-500 text-sm">판매자용 주문 관리 기능입니다</p>
            <button onClick={() => router.push('/my-orders')} className="btn-primary px-5 mt-4">주문 목록 보기</button>
          </div>
        )}
      </div>
    </main>
  );
}
