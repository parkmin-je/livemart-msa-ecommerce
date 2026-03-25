'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set(items.map(i => i.productId)));
  const [relatedProducts, setRelatedProducts] = useState<Array<{id:number;name:string;price:number;imageUrl:string}>>([]);

  useEffect(() => {
    const firstId = items[0]?.productId;
    const url = firstId ? `/api/products/${firstId}/related` : `/api/products?size=6`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.content || []);
        setRelatedProducts(list.slice(0, 6).map((p: {id:number;name:string;price:number;imageUrl:string}) => ({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl })));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = items
    .filter(i => selectedItems.has(i.productId))
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingFee = subtotal >= 50000 ? 0 : subtotal > 0 ? 3000 : 0;
  const discount = couponDiscount;
  const total = subtotal + shippingFee - discount;
  const freeShippingRemain = Math.max(0, 50000 - subtotal);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch(`/api/coupons/${couponCode.trim()}/preview?orderAmount=${subtotal}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const disc = data.discountAmount || 0;
        setCouponDiscount(disc);
        toast.success(`쿠폰 적용! ${disc.toLocaleString()}원 할인`);
      } else {
        toast.error('유효하지 않은 쿠폰입니다');
        setCouponDiscount(0);
      }
    } catch {
      toast.error('쿠폰 확인 중 오류가 발생했습니다');
    }
    setCouponLoading(false);
  };

  const toggleItem = (productId: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedItems.size === items.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(items.map(i => i.productId)));
  };

  const handleCheckout = () => {
    if (selectedItems.size === 0) { toast.error('주문할 상품을 선택하세요'); return; }
    router.push('/orders/new');
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen pb-28 md:pb-0" style={{ background: '#F7F6F1' }}>
        <GlobalNav />
        <div className="max-w-[1280px] mx-auto px-4 py-16 text-center">
          <div
            className="py-24 px-8 max-w-md mx-auto"
            style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
          >
            <svg
              className="w-16 h-16 mx-auto mb-6"
              style={{ color: 'rgba(14,14,14,0.15)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>장바구니가 비어있습니다</h2>
            <p className="text-sm mb-8" style={{ color: 'rgba(14,14,14,0.45)' }}>마음에 드는 상품을 담아보세요</p>
            <a
              href="/products"
              className="inline-block px-8 py-3 text-white text-sm font-semibold transition-colors"
              style={{ background: '#E8001D' }}
            >
              쇼핑 계속하기
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#0E0E0E' }}>장바구니</h1>

        <div className="flex gap-6 items-start">
          {/* 왼쪽: 상품 목록 */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* 무료배송 프로그레스 */}
            {freeShippingRemain > 0 && (
              <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'rgba(14,14,14,0.65)' }}>
                    <span className="font-bold" style={{ color: '#E8001D' }}>{freeShippingRemain.toLocaleString()}원</span> 더 담으면 무료배송
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(14,14,14,0.35)' }}>5만원 이상</span>
                </div>
                <div className="h-1.5 overflow-hidden" style={{ background: 'rgba(14,14,14,0.06)' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (subtotal / 50000) * 100)}%`, background: '#E8001D' }}
                  />
                </div>
              </div>
            )}
            {subtotal >= 50000 && (
              <div
                className="p-3 flex items-center gap-2"
                style={{ background: '#F0FFF4', border: '1px solid rgba(0,168,84,0.2)' }}
              >
                <svg className="w-4 h-4 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-700">무료배송 달성! 배송비가 무료입니다.</span>
              </div>
            )}

            {/* 전체선택 */}
            <div className="px-4 py-3" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm font-medium" style={{ color: 'rgba(14,14,14,0.65)' }}>
                    전체선택 ({selectedItems.size}/{items.length})
                  </span>
                </label>
                <button
                  onClick={() => { if (confirm('선택한 상품을 삭제하시겠습니까?')) selectedItems.forEach(id => removeItem(id)); }}
                  className="text-sm transition-colors"
                  style={{ color: 'rgba(14,14,14,0.35)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#E8001D')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.35)')}
                >
                  선택삭제
                </button>
              </div>
            </div>

            {/* 상품 목록 */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(14,14,14,0.07)',
                borderTop: 'none',
              }}
            >
              {items.map((item, idx) => (
                <div
                  key={item.productId}
                  className="p-4 flex gap-4 group"
                  style={{
                    borderTop: idx === 0 ? '1px solid rgba(14,14,14,0.07)' : 'none',
                    borderBottom: '1px solid rgba(14,14,14,0.05)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.productId)}
                    onChange={() => toggleItem(item.productId)}
                    className="mt-1 w-4 h-4 accent-red-600 flex-shrink-0"
                  />
                  <div
                    className="w-20 h-20 overflow-hidden flex-shrink-0 cursor-pointer"
                    style={{ background: '#F5F4F0' }}
                    onClick={() => router.push(`/products/${item.productId}`)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-medium line-clamp-2 cursor-pointer transition-colors text-sm"
                      style={{ color: '#0E0E0E' }}
                      onClick={() => router.push(`/products/${item.productId}`)}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E8001D')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#0E0E0E')}
                    >
                      {item.name}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'rgba(14,14,14,0.35)' }}>빠른배송</p>
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      {/* 수량 조절 */}
                      <div className="flex items-center overflow-hidden" style={{ border: '1px solid rgba(14,14,14,0.14)' }}>
                        <button
                          onClick={() => item.quantity > 1 ? updateQuantity(item.productId, item.quantity - 1) : removeItem(item.productId)}
                          className="w-8 h-8 flex items-center justify-center font-bold text-lg transition-colors"
                          style={{ color: 'rgba(14,14,14,0.55)' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(14,14,14,0.04)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          −
                        </button>
                        <span
                          className="w-10 text-center text-sm font-semibold"
                          style={{ color: '#0E0E0E', borderLeft: '1px solid rgba(14,14,14,0.1)', borderRight: '1px solid rgba(14,14,14,0.1)' }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center font-bold text-lg transition-colors"
                          style={{ color: 'rgba(14,14,14,0.55)' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(14,14,14,0.04)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-base font-bold" style={{ color: '#0E0E0E' }}>
                          {(item.price * item.quantity).toLocaleString()}원
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="transition-colors opacity-0 group-hover:opacity-100"
                          style={{ color: 'rgba(14,14,14,0.25)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#E8001D')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.25)')}
                          aria-label="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 쿠폰 */}
            <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#0E0E0E' }}>쿠폰 적용</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                  placeholder="쿠폰 코드를 입력하세요"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none transition-colors"
                  style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E' }}
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading}
                  className="px-4 py-2 text-white text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
                  style={{ background: '#0A0A0A' }}
                  onMouseEnter={e => !couponLoading && (e.currentTarget.style.background = '#E8001D')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                >
                  {couponLoading ? '확인중...' : '적용'}
                </button>
              </div>
              {couponDiscount > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-600 font-medium">쿠폰 {couponDiscount.toLocaleString()}원 할인 적용됨</p>
                </div>
              )}
            </div>

            {/* 함께 구매하면 좋은 상품 */}
            {relatedProducts.length > 0 && (
              <div>
                <h2 className="text-base font-bold mb-3" style={{ color: '#0E0E0E' }}>함께 구매하면 좋은 상품</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {relatedProducts.map(item => (
                    <a
                      key={item.id}
                      href={`/products/${item.id}`}
                      className="p-3 group text-center transition-colors"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.2)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.07)')}
                    >
                      <div className="aspect-square overflow-hidden mb-2" style={{ background: '#F5F4F0' }}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium line-clamp-2 leading-snug mb-1" style={{ color: 'rgba(14,14,14,0.7)' }}>{item.name}</p>
                      <p className="text-sm font-bold" style={{ color: '#0E0E0E' }}>{item.price.toLocaleString()}원</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 모바일 하단 고정 결제 바 */}
          <div
            className="fixed bottom-14 left-0 right-0 z-30 md:hidden px-4 py-3 flex items-center gap-3"
            style={{ background: '#FFFFFF', borderTop: '1px solid rgba(14,14,14,0.1)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>
                {selectedItems.size > 0 ? `${selectedItems.size}개 선택` : '상품을 선택하세요'}
              </div>
              <div className="text-lg font-black tabular-nums" style={{ color: '#0E0E0E' }}>
                {total > 0 ? (
                  <>{total.toLocaleString()}<span className="text-sm font-normal ml-0.5" style={{ color: 'rgba(14,14,14,0.4)' }}>원</span></>
                ) : '-'}
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={selectedItems.size === 0}
              className="flex-shrink-0 text-white font-bold px-6 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ background: '#E8001D' }}
              onMouseEnter={e => !selectedItems.size || (e.currentTarget.style.background = '#C0001A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}
            >
              주문하기
            </button>
          </div>

          {/* 오른쪽: 주문 요약 */}
          <div className="w-72 flex-shrink-0 sticky top-[156px] hidden md:block">
            <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <h2 className="font-bold text-sm mb-4" style={{ color: '#0E0E0E' }}>주문 요약</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between" style={{ color: 'rgba(14,14,14,0.55)' }}>
                  <span>상품금액</span>
                  <span>{subtotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between" style={{ color: 'rgba(14,14,14,0.55)' }}>
                  <span>배송비</span>
                  <span style={{ color: shippingFee === 0 && subtotal > 0 ? '#00A854' : undefined, fontWeight: shippingFee === 0 && subtotal > 0 ? 600 : undefined }}>
                    {subtotal === 0 ? '-' : shippingFee === 0 ? '무료' : `+${shippingFee.toLocaleString()}원`}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>쿠폰할인</span>
                    <span>-{discount.toLocaleString()}원</span>
                  </div>
                )}
                <div
                  className="pt-3 flex justify-between font-bold"
                  style={{ color: '#0E0E0E', borderTop: '1px solid rgba(14,14,14,0.07)' }}
                >
                  <span>총 결제금액</span>
                  <span style={{ color: '#E8001D', fontSize: '1.1rem' }}>{total.toLocaleString()}원</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedItems.size === 0}
                className="mt-5 w-full py-3 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#E8001D' }}
                onMouseEnter={e => selectedItems.size && (e.currentTarget.style.background = '#C0001A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}
              >
                {selectedItems.size > 0 ? `${selectedItems.size}개 상품 주문하기` : '상품을 선택하세요'}
              </button>
              <p className="text-xs text-center mt-3" style={{ color: 'rgba(14,14,14,0.35)' }}>
                안전결제 · SSL 암호화 · 개인정보 보호
              </p>
            </div>

            {/* 혜택 안내 */}
            <div
              className="mt-3 p-4 space-y-2"
              style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.07)' }}
            >
              <p className="text-xs font-bold tracking-wide" style={{ color: 'rgba(14,14,14,0.55)' }}>LiveMart 혜택</p>
              {[
                '5만원 이상 무료배송',
                'Stripe 안전결제 지원',
                '신규회원 3,000원 쿠폰',
              ].map(benefit => (
                <div key={benefit} className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(14,14,14,0.35)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs" style={{ color: 'rgba(14,14,14,0.55)' }}>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
