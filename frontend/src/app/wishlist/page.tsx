'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface WishItem {
  id: number;
  productId: number;
  product: { id: number; name: string; price: number; imageUrl?: string; description?: string; stockQuantity?: number };
}

export default function WishlistPage() {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/users/${userId}/wishlist`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setItems(d.content || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const removeWish = async (wishId: number) => {
    try {
      await fetch(`/api/users/${userId}/wishlist/${wishId}`, {
        method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setItems(items.filter(i => i.id !== wishId));
      toast.success('위시리스트에서 제거됐습니다');
    } catch { toast.error('제거 실패'); }
  };

  const addToCart = (item: WishItem) => {
    addItem({ productId: item.product.id, name: item.product.name, price: item.product.price, quantity: 1, imageUrl: item.product.imageUrl });
    toast.success('장바구니에 추가됐습니다!');
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">위시리스트 <span className="text-gray-400 text-lg font-normal">({items.length})</span></h1>

        {!userId ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <a href="/auth" className="btn-primary px-6 mt-4 inline-block">로그인하기</a>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2"><div className="h-4 bg-gray-200 rounded" /><div className="h-8 bg-gray-200 rounded mt-4" /></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">위시리스트가 비어있습니다</h2>
            <p className="text-gray-500 mb-6">마음에 드는 상품에 하트를 눌러보세요!</p>
            <a href="/products" className="btn-primary px-6">쇼핑하기</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-gray-100 cursor-pointer" onClick={() => router.push(`/products/${item.product.id}`)}>
                  {item.product.imageUrl
                    ? <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                  <button
                    onClick={e => { e.stopPropagation(); removeWish(item.id); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-red-500 hover:text-red-700 transition-colors"
                    title="위시리스트 제거"
                  >
                    ❤️
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 cursor-pointer hover:text-red-600"
                    onClick={() => router.push(`/products/${item.product.id}`)}>
                    {item.product.name}
                  </h3>
                  <p className="text-base font-bold text-gray-900 mb-2">{item.product.price.toLocaleString()}원</p>
                  <button onClick={() => addToCart(item)} className="w-full btn-primary text-sm py-2">장바구니 담기</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
