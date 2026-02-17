'use client';

import { useState, useEffect } from 'react';
import { productApi } from '@/api/productApi';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category?: string;
  imageUrl?: string;
  active?: boolean;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stockQuantity: string;
  category: string;
}

const emptyForm: ProductForm = { name: '', description: '', price: '', stockQuantity: '', category: '' };

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productApi.getProducts({ page, size: 12 });
      setProducts(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stockQuantity) {
      toast.error('필수 항목을 입력해주세요.');
      return;
    }
    setFormLoading(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity),
        category: form.category || 'GENERAL',
      };

      const token = localStorage.getItem('token') || '';
      const url = editingId
        ? `${API_BASE}/api/products/${editingId}`
        : `${API_BASE}/api/products`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.');
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        fetchProducts();
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stockQuantity: product.stockQuantity.toString(),
      category: product.category || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('상품이 삭제되었습니다.');
      fetchProducts();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/admin" className="text-sm text-gray-700 hover:text-blue-600">관리자</a>
              <a href="/seller" className="text-sm text-gray-700 hover:text-blue-600">판매자</a>
              <span className="text-sm font-medium text-blue-600">상품 관리</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">상품 관리</h1>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? '닫기' : '+ 새 상품 등록'}
          </button>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">{editingId ? '상품 수정' : '새 상품 등록'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상품명 *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" placeholder="상품명 입력" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none">
                  <option value="">선택</option>
                  <option value="ELECTRONICS">전자제품</option>
                  <option value="FASHION">패션</option>
                  <option value="FOOD">식품</option>
                  <option value="HOME">홈/리빙</option>
                  <option value="BEAUTY">뷰티</option>
                  <option value="SPORTS">스포츠</option>
                  <option value="GENERAL">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원) *</label>
                <input type="number" required min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" placeholder="10000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">재고 수량 *</label>
                <input type="number" required min="0" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" placeholder="100" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" placeholder="상품 설명을 입력하세요" />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={formLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">
                  {formLoading ? '저장 중...' : editingId ? '수정' : '등록'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition">취소</button>
              </div>
            </form>
          </div>
        )}

        {/* Product List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-gray-500">등록된 상품이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가격</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">재고</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{product.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{product.category || '-'}</span>
                    </td>
                    <td className="px-6 py-4 font-medium">{product.price?.toLocaleString()}원</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity < 10 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(product)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">수정</button>
                        <button onClick={() => handleDelete(product.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">이전</button>
              <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">다음</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
