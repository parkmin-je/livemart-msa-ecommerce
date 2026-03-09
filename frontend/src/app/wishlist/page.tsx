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

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/users/${userId}/wishlist`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setItems(d.content || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const removeWish = async (wishId: number) => {
    try {
      await fetch(`/api/users/${userId}/wishlist/${wishId}`, {
        method: 'DELETE', credentials: 'include',
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
    <main className="min-h-screen bg-gray-100 pb-14 md:pb-0">
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
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">총 <span className="font-semibold text-gray-900">{items.length}</span>개 상품</p>
              <button onClick={() => { items.forEach(i => addToCart(i)); toast.success('전체 장바구니에 담았습니다!'); }}
                className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-4 py-1.5 rounded-lg transition-colors">
                전체 장바구니 담기
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item, idx) => {
                const discountRate = [0,5,10,15,20,25,30][item.product.id % 7];
                const rating = [4.2,4.5,4.7,4.8,4.3,4.6,4.9][item.product.id % 7];
                const originalPrice = discountRate > 0 ? Math.round(item.product.price / (1 - discountRate/100) / 100) * 100 : 0;
                const isLowStock = item.product.stockQuantity != null && item.product.stockQuantity > 0 && item.product.stockQuantity < 10;
                const isOutOfStock = item.product.stockQuantity === 0;
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-lg hover:border-gray-200 transition-all">
                    <div className="relative aspect-square bg-gray-100 cursor-pointer" onClick={() => router.push(`/products/${item.product.id}`)}>
                      {item.product.imageUrl
                        ? <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200">📦</div>}
                      {/* 배지들 */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {discountRate > 0 && (
                          <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-sm">{discountRate}% 할인</span>
                        )}
                        {isLowStock && (
                          <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-sm">{item.product.stockQuantity}개 남음</span>
                        )}
                      </div>
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-black/70 text-white text-sm font-bold px-4 py-2 rounded-lg">품절</span>
                        </div>
                      )}
                      <button onClick={e => { e.stopPropagation(); removeWish(item.id); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-red-500 hover:scale-110 transition-transform"
                        title="위시리스트 제거">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5 cursor-pointer hover:text-red-600 leading-snug"
                        onClick={() => router.push(`/products/${item.product.id}`)}>
                        {item.product.name}
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
                        <p className="text-base font-black text-gray-900">{item.product.price.toLocaleString()}<span className="text-sm font-normal text-gray-500 ml-0.5">원</span></p>
                      </div>
                      <button onClick={() => !isOutOfStock && addToCart(item)} disabled={isOutOfStock}
                        className="w-full text-sm py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]">
                        {isOutOfStock ? '품절' : '장바구니 담기'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
