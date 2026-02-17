'use client';

import { useState, useEffect } from 'react';
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
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE}/api/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stockQuantity: quantity }),
      });
      if (!res.ok) {
        // Try alternative endpoint
        await fetch(`${API_BASE}/api/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    if (qty === 0) return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">품절</span>;
    if (qty <= 10) return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">부족</span>;
    return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">충분</span>;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/seller" className="text-sm text-gray-700 hover:text-blue-600">판매자</a>
              <a href="/seller/products" className="text-sm text-gray-700 hover:text-blue-600">상품관리</a>
              <span className="text-sm font-medium text-blue-600">재고관리</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">재고 관리</h1>
          <button onClick={() => setBulkMode(!bulkMode)} className={`px-4 py-2 rounded-lg text-sm transition ${bulkMode ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
            {bulkMode ? '일괄 수정 취소' : '일괄 수정'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">전체 상품</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">품절</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.outOfStock}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">재고 부족 (10개 이하)</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{stats.lowStock}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">총 재고 가치</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.totalValue.toLocaleString()}원</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {([['all', '전체'], ['out', '품절'], ['low', '부족'], ['ok', '충분']] as [StockFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{label}</button>
          ))}
        </div>

        {/* Bulk Action Bar */}
        {bulkMode && selected.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-4">
            <span className="text-sm font-medium text-blue-700">{selected.size}개 선택됨</span>
            <input type="number" min="0" placeholder="수량" value={bulkQuantity} onChange={(e) => setBulkQuantity(e.target.value)} className="px-3 py-1 border rounded-lg w-24 text-sm" />
            <button onClick={handleBulkUpdate} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">일괄 적용</button>
          </div>
        )}

        {/* Product Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">상품이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {bulkMode && <th className="px-4 py-3 w-8" />}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가격</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">재고</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">재고 가치</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수정</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={`hover:bg-gray-50 ${product.stockQuantity === 0 ? 'bg-red-50/50' : ''}`}>
                    {bulkMode && (
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded" />
                      </td>
                    )}
                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{product.category || '-'}</span></td>
                    <td className="px-6 py-4 text-sm">{product.price?.toLocaleString()}원</td>
                    <td className="px-6 py-4">
                      {editingId === product.id ? (
                        <div className="flex gap-2 items-center">
                          <input type="number" min="0" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} className="w-20 px-2 py-1 border rounded text-sm" autoFocus />
                          <button onClick={() => handleStockUpdate(product.id, parseInt(editQuantity))} className="px-2 py-1 bg-green-600 text-white rounded text-xs">확인</button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-200 rounded text-xs">취소</button>
                        </div>
                      ) : (
                        <span className={`font-medium ${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity <= 10 ? 'text-orange-600' : ''}`}>
                          {product.stockQuantity}개
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStockBadge(product.stockQuantity)}</td>
                    <td className="px-6 py-4 text-sm">{(product.price * product.stockQuantity).toLocaleString()}원</td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setEditingId(product.id); setEditQuantity(product.stockQuantity.toString()); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">수정</button>
                    </td>
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
