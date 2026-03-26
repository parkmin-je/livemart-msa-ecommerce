'use client';

import { useState, useEffect } from 'react';
import { GlobalNav } from '@/components/GlobalNav';
import { productApi } from '@/api/productApi';
import toast from 'react-hot-toast';

const API_BASE = '';

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  categoryName?: string;
  category?: string;
}

type StockFilter = 'all' | 'out' | 'low' | 'ok';

export default function SellerInventoryPage() {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkQuantity, setBulkQuantity] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productApi.getProducts({ page: 0, size: 100 });
      setProducts(data.content || []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filteredProducts = products.filter((p) => {
    if (filter === 'out') return p.stockQuantity === 0;
    if (filter === 'low') return p.stockQuantity > 0 && p.stockQuantity <= 10;
    if (filter === 'ok') return p.stockQuantity > 10;
    return true;
  });

  const stats = {
    total: products.length,
    outOfStock: products.filter(p => p.stockQuantity === 0).length,
    lowStock: products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0),
  };

  const handleStockUpdate = async (productId: number, quantity: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/stock?stockQuantity=${quantity}`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('재고 수정 실패');
      toast.success('재고가 수정되었습니다.');
      setEditingId(null);
      fetchProducts();
    } catch {
      toast.error('재고 수정에 실패했습니다.');
    }
  };

  const handleBulkUpdate = async () => {
    const qty = parseInt(bulkQuantity);
    if (isNaN(qty) || qty < 0) {
      toast.error('올바른 수량을 입력해주세요.');
      return;
    }
    for (const id of selected) {
      await handleStockUpdate(id, qty);
    }
    setSelected(new Set());
    setBulkQuantity('');
    setBulkMode(false);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) return <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(232,0,29,0.07)', color: '#C8001A', border: '1px solid rgba(232,0,29,0.2)' }}>품절</span>;
    if (qty <= 10) return <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(234,88,12,0.07)', color: 'rgb(194,65,12)', border: '1px solid rgba(234,88,12,0.2)' }}>부족</span>;
    return <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)', border: '1px solid rgba(16,185,129,0.2)' }}>충분</span>;
  };

  const FILTER_TABS: [StockFilter, string][] = [
    ['all', '전체'],
    ['out', '품절'],
    ['low', '재고부족'],
    ['ok', '충분'],
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      {/* Seller header bar */}
      <div className="text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/seller" className="text-xs font-semibold tracking-widest uppercase transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>Seller</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>재고 관리</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-14 md:pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>재고 관리</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>상품 재고 현황을 확인하고 수정하세요</p>
          </div>
          <div className="flex gap-2">
            <a href="/seller"
              className="px-4 py-2 text-sm transition-colors"
              style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.6)', background: '#FFFFFF' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}>
              판매자 센터
            </a>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className="px-4 py-2 text-sm font-semibold transition-colors"
              style={bulkMode
                ? { border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.7)', background: '#FFFFFF' }
                : { background: '#0A0A0A', color: '#FFFFFF', border: '1px solid transparent' }}
              onMouseEnter={e => { if (!bulkMode) e.currentTarget.style.background = '#E8001D'; }}
              onMouseLeave={e => { if (!bulkMode) e.currentTarget.style.background = '#0A0A0A'; }}
            >
              {bulkMode ? '일괄수정 취소' : '일괄 수정'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 상품', value: stats.total, color: '#0E0E0E' },
            { label: '품절', value: stats.outOfStock, color: '#E8001D' },
            { label: '재고 부족', value: stats.lowStock, color: 'rgb(194,65,12)' },
            { label: '총 재고 가치', value: `${stats.totalValue.toLocaleString()}원`, color: 'rgb(4,120,87)' },
          ].map(s => (
            <div key={s.label} className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <p className="text-xs font-medium" style={{ color: 'rgba(14,14,14,0.5)' }}>{s.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-5">
          {FILTER_TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3.5 py-2 text-xs font-semibold transition-colors"
              style={filter === key
                ? { background: '#0A0A0A', color: '#FFFFFF', border: '1px solid transparent' }
                : { background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.12)', color: 'rgba(14,14,14,0.6)' }}
              onMouseEnter={e => { if (filter !== key) e.currentTarget.style.background = '#F7F6F1'; }}
              onMouseLeave={e => { if (filter !== key) e.currentTarget.style.background = '#FFFFFF'; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bulk Action Bar */}
        {bulkMode && selected.size > 0 && (
          <div className="p-4 mb-4 flex items-center gap-4 flex-wrap"
            style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.14)' }}>
            <span className="text-sm font-semibold" style={{ color: '#0E0E0E' }}>{selected.size}개 선택됨</span>
            <input
              type="number"
              min="0"
              placeholder="일괄 적용 수량"
              value={bulkQuantity}
              onChange={(e) => setBulkQuantity(e.target.value)}
              className="px-3 py-1.5 text-sm focus:outline-none w-32"
              style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
            />
            <button
              onClick={handleBulkUpdate}
              className="px-4 py-1.5 text-sm font-semibold transition-colors"
              style={{ background: '#0A0A0A', color: '#FFFFFF' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
            >
              일괄 적용
            </button>
          </div>
        )}

        {/* Product Table */}
        <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 rounded-full mx-auto"
                style={{ border: '2px solid rgba(14,14,14,0.1)', borderTopColor: '#E8001D' }} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>상품이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F7F6F1', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
                  {bulkMode && <th className="px-4 py-3 w-10" />}
                  {['상품명','카테고리','가격','재고','상태','재고 가치','수정'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'rgba(14,14,14,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom: '1px solid rgba(14,14,14,0.05)',
                      background: product.stockQuantity === 0 ? 'rgba(232,0,29,0.025)' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                    onMouseLeave={e => (e.currentTarget.style.background = product.stockQuantity === 0 ? 'rgba(232,0,29,0.025)' : 'transparent')}
                  >
                    {bulkMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="w-4 h-4"
                        />
                      </td>
                    )}
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: '#0E0E0E' }}>{product.name}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 text-xs"
                        style={{ background: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.6)', border: '1px solid rgba(14,14,14,0.1)' }}>
                        {product.categoryName || product.category || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.7)' }}>{product.price?.toLocaleString()}원</td>
                    <td className="px-5 py-3">
                      {editingId === product.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-20 px-2 py-1 text-sm focus:outline-none"
                            style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleStockUpdate(product.id, parseInt(editQuantity))}
                            className="px-2.5 py-1 text-xs font-medium"
                            style={{ background: '#0A0A0A', color: '#FFFFFF' }}
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 text-xs"
                            style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.6)' }}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold" style={{
                          color: product.stockQuantity === 0 ? '#E8001D'
                            : product.stockQuantity <= 10 ? 'rgb(194,65,12)'
                            : '#0E0E0E',
                        }}>
                          {product.stockQuantity}개
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">{getStockBadge(product.stockQuantity)}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.6)' }}>{(product.price * product.stockQuantity).toLocaleString()}원</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => { setEditingId(product.id); setEditQuantity(product.stockQuantity.toString()); }}
                        className="px-2.5 py-1 text-xs transition-colors"
                        style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.6)', background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
