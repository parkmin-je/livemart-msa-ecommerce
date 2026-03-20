'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface WishItem {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  productImageUrl?: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    fetch(`/api/users/${uid}/wishlist`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setItems(d.content || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const removeWish = async (item: WishItem) => {
    try {
      await fetch(`/api/users/${userId}/wishlist/${item.productId}`, {
        method: 'DELETE', credentials: 'include',
      });
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('위시리스트에서 제거됐습니다');
    } catch { toast.error('제거 실패'); }
  };

  const addToCart = (item: WishItem) => {
    addItem({ productId: item.productId, name: item.productName, price: item.productPrice, quantity: 1, imageUrl: item.productImageUrl });
    toast.success('장바구니에 추가됐습니다!');
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            위시리스트
            {items.length > 0 && <span className="ml-2 text-gray-400 text-base font-normal">({items.length})</span>}
          </h1>
          {items.length > 0 && (
            <button
              onClick={() => { items.forEach(i => addToCart(i)); toast.success('전체 장바구니에 담았습니다!'); }}
              className="text-sm font-semibold text-gray-700 border border-gray-300 hover:border-gray-500 px-4 py-2 transition-colors"
            >
              전체 장바구니 담기
            </button>
          )}
        </div>

        {!userId ? (
          <div className="text-center py-20 bg-white border border-gray-200">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-base font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <a href="/auth" className="inline-block mt-4 px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
              로그인하기
            </a>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-8 bg-gray-100 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200">
            <svg className="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h2 className="text-base font-bold text-gray-900 mb-2">위시리스트가 비어있습니다</h2>
            <p className="text-gray-500 text-sm mb-6">마음에 드는 상품에 하트를 눌러보세요</p>
            <a href="/products" className="inline-block px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
              쇼핑하기
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const discountRate = [0,5,10,15,20,25,30][item.productId % 7];
              const rating = [4.2,4.5,4.7,4.8,4.3,4.6,4.9][item.productId % 7];
              const originalPrice = discountRate > 0 ? Math.round(item.productPrice / (1 - discountRate/100) / 100) * 100 : 0;
              return (
                <div key={item.id} className="bg-white border border-gray-200 overflow-hidden group hover:border-gray-400 transition-all">
                  <div className="relative aspect-square bg-gray-100 cursor-pointer" onClick={() => router.push(`/products/${item.productId}`)}>
                    {item.productImageUrl ? (
                      <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    {/* 할인 배지 */}
                    {discountRate > 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5">{discountRate}% 할인</span>
                      </div>
                    )}
                    {/* 위시 제거 버튼 */}
                    <button
                      onClick={e => { e.stopPropagation(); removeWish(item); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white flex items-center justify-center shadow text-red-500 hover:scale-110 transition-transform"
                      title="위시리스트 제거"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="p-3">
                    <h3
                      className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5 cursor-pointer hover:text-red-600 leading-snug"
                      onClick={() => router.push(`/products/${item.productId}`)}
                    >
                      {item.productName}
                    </h3>
                    {/* 별점 */}
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} className={`w-3 h-3 ${s <= Math.floor(rating) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
                    </div>
                    {/* 가격 */}
                    <div className="mb-2">
                      {discountRate > 0 && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-red-600">{discountRate}%</span>
                          <span className="text-xs text-gray-400 line-through">{originalPrice.toLocaleString()}원</span>
                        </div>
                      )}
                      <p className="text-base font-black text-gray-900">
                        {item.productPrice.toLocaleString()}<span className="text-sm font-normal text-gray-500 ml-0.5">원</span>
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-full text-sm py-2 font-semibold transition-all bg-red-600 text-white hover:bg-red-700"
                    >
                      장바구니 담기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
