'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface WishlistItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  createdAt: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('userId') || '1') : 1;

  useEffect(() => {
    fetch(`${API_BASE}/api/users/${userId}/wishlist`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const removeFromWishlist = async (wishlistId: number) => {
    try {
      await fetch(`${API_BASE}/api/users/${userId}/wishlist/${wishlistId}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== wishlistId));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const moveToCart = (item: WishlistItem) => {
    addItem({
      productId: item.productId,
      name: item.productName,
      price: item.productPrice,
      quantity: 1,
      imageUrl: item.imageUrl,
    });
    removeFromWishlist(item.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">상품</a>
              <a href="/cart" className="text-sm text-gray-700 hover:text-blue-600">장바구니</a>
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">위시리스트</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-16 shadow-sm text-center">
            <div className="text-6xl mb-4">💝</div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">위시리스트가 비어있습니다</h2>
            <p className="text-gray-500 mb-6">마음에 드는 상품을 저장해보세요!</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition"
            >
              상품 둘러보기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-4">{items.length}개 상품</div>

            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm flex gap-6 items-center">
                <div
                  className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
                  onClick={() => router.push(`/products/${item.productId}`)}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-3xl">💝</span>
                  )}
                </div>

                <div className="flex-1">
                  <h3
                    className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => router.push(`/products/${item.productId}`)}
                  >
                    {item.productName}
                  </h3>
                  <div className="text-lg font-bold text-blue-600 mt-1">
                    ₩{item.productPrice?.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')} 추가
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => moveToCart(item)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                  >
                    장바구니 담기
                  </button>
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
