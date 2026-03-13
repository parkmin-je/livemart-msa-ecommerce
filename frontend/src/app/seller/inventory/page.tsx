'use client';

import { useState, useEffect } from 'react';
import { GlobalNav } from '@/components/GlobalNav';
import { productApi } from '@/api/productApi';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
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
      const res = await fetch(`${API_BASE}/api/products/${productId}/stock`, {
        method: 'PUT',
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: quantity }),
      });
      if (!res.ok) {
        // Try alternative endpoint
        await fetch(`${API_BASE}/api/products/${productId}`, {
          method: 'PUT',
          credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: quantity }),
        });
      }
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
    if (qty === 0) return <span className="text-[11px] font-semibold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200">품절</span>;
    if (qty <= 10) return <span className="text-[11px] font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200">부족</span>;
    return <span className="text-[11px] font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200">충분</span>;
  };

  const FILTER_TABS: [StockFilter, string][] = [
    ['all', '전체'],
    ['out', '품절'],
    ['low', '재고부족'],
    ['ok', '충분'],
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav />

      {/* Seller header bar */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/seller" className="text-xs font-semibold tracking-widest text-gray-400 uppercase hover:text-white transition-colors">Seller</a>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-300">재고 관리</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-14 md:pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">재고 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">상품 재고 현황을 확인하고 수정하세요</p>
          </div>
          <div className="flex gap-2">
            <a href="/seller" className="px-4 py-2 border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              판매자 센터
            </a>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                bulkMode
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {bulkMode ? '일괄수정 취소' : '일괄 수정'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 상품', value: stats.total, color: 'text-gray-900' },
            { label: '품절', value: stats.outOfStock, color: 'text-red-600' },
            { label: '재고 부족', value: stats.lowStock, color: 'text-orange-600' },
            { label: '총 재고 가치', value: `${stats.totalValue.toLocaleString()}원`, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 p-5">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-5">
          {FILTER_TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-gray-950 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bulk Action Bar */}
        {bulkMode && selected.size > 0 && (
          <div className="bg-gray-50 border border-gray-300 p-4 mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{selected.size}개 선택됨</span>
            <input
              type="number"
              min="0"
              placeholder="일괄 적용 수량"
              value={bulkQuantity}
              onChange={(e) => setBulkQuantity(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 text-sm focus:outline-none focus:border-gray-500 w-32"
            />
            <button
              onClick={handleBulkUpdate}
              className="px-4 py-1.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              일괄 적용
            </button>
          </div>
        )}

        {/* Product Table */}
        <div className="bg-white border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">상품이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {bulkMode && <th className="px-4 py-3 w-10" />}
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상품명</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">카테고리</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">가격</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">재고</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">재고 가치</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 transition-colors ${product.stockQuantity === 0 ? 'bg-red-50/40' : ''}`}
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
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs border border-gray-200">{product.category || '-'}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{product.price?.toLocaleString()}원</td>
                    <td className="px-5 py-3">
                      {editingId === product.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleStockUpdate(product.id, parseInt(editQuantity))}
                            className="px-2.5 py-1 bg-gray-900 text-white text-xs font-medium"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 border border-gray-300 text-gray-600 text-xs"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-semibold ${
                          product.stockQuantity === 0 ? 'text-red-600'
                          : product.stockQuantity <= 10 ? 'text-orange-600'
                          : 'text-gray-900'
                        }`}>
                          {product.stockQuantity}개
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">{getStockBadge(product.stockQuantity)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{(product.price * product.stockQuantity).toLocaleString()}원</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => { setEditingId(product.id); setEditQuantity(product.stockQuantity.toString()); }}
                        className="px-2.5 py-1 border border-gray-300 text-gray-600 text-xs hover:bg-gray-100 transition-colors"
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
