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
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>
            위시리스트
            {items.length > 0 && (
              <span className="ml-2 text-base font-normal" style={{ color: 'rgba(14,14,14,0.4)' }}>({items.length})</span>
            )}
          </h1>
          {items.length > 0 && (
            <button
              onClick={() => { items.forEach(i => addToCart(i)); toast.success('전체 장바구니에 담았습니다!'); }}
              className="text-sm font-semibold px-4 py-2 transition-colors"
              style={{ border: '1px solid rgba(14,14,14,0.2)', color: '#0E0E0E', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#0E0E0E')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.2)')}
            >
              전체 장바구니 담기
            </button>
          )}
        </div>

        {!userId ? (
          <div className="text-center py-20" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-base font-bold mb-2" style={{ color: '#0E0E0E' }}>로그인이 필요합니다</h2>
            <a href="/auth" className="inline-block mt-4 px-6 py-2 text-white text-sm font-semibold transition-colors" style={{ background: '#E8001D' }}>
              로그인하기
            </a>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <div className="aspect-square" style={{ background: '#EDEBE4' }} />
                <div className="p-3 space-y-2">
                  <div className="h-4 rounded" style={{ background: '#EDEBE4' }} />
                  <div className="h-8 rounded mt-4" style={{ background: '#EDEBE4' }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <svg className="w-14 h-14 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h2 className="text-base font-bold mb-2" style={{ color: '#0E0E0E' }}>위시리스트가 비어있습니다</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(14,14,14,0.5)' }}>마음에 드는 상품에 하트를 눌러보세요</p>
            <a href="/products" className="inline-block px-6 py-2 text-white text-sm font-semibold transition-colors" style={{ background: '#E8001D' }}>
              쇼핑하기
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden group transition-colors"
                style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.07)')}
              >
                <div
                  className="relative aspect-square cursor-pointer"
                  style={{ background: '#F5F4F0' }}
                  onClick={() => router.push(`/products/${item.productId}`)}
                >
                  {item.productImageUrl ? (
                    <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  {/* 위시 제거 버튼 */}
                  <button
                    onClick={e => { e.stopPropagation(); removeWish(item); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-white flex items-center justify-center shadow hover:scale-110 transition-transform"
                    style={{ color: '#E8001D' }}
                    title="위시리스트 제거"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                  </button>
                </div>
                <div className="p-3">
                  <h3
                    className="text-sm font-medium line-clamp-2 mb-2 cursor-pointer leading-snug transition-colors"
                    style={{ color: '#0E0E0E' }}
                    onClick={() => router.push(`/products/${item.productId}`)}
                    onMouseEnter={e => (e.currentTarget.style.color = '#E8001D')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#0E0E0E')}
                  >
                    {item.productName}
                  </h3>
                  {/* 가격 */}
                  <div className="flex items-baseline gap-0.5 mb-3">
                    <span className="font-bebas tabular-nums" style={{ fontSize: '1.2rem', color: '#0E0E0E', letterSpacing: '0.01em' }}>
                      {item.productPrice.toLocaleString()}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>원</span>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-full text-sm py-2 font-semibold transition-colors text-white"
                    style={{ background: '#0A0A0A' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                  >
                    장바구니 담기
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
