'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set(items.map(i => i.productId)));

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
      const res = await fetch(`/api/coupons/${couponCode.trim()}/preview?orderAmount=${subtotal}`);
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
      <main className="min-h-screen bg-gray-100">
        <GlobalNav />
        <div className="max-w-[1280px] mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl border border-gray-100 py-24 px-8 max-w-md mx-auto">
            <div className="text-7xl mb-6">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">장바구니가 비어있습니다</h2>
            <p className="text-gray-500 mb-8">마음에 드는 상품을 담아보세요!</p>
            <a href="/products" className="btn-primary px-8 py-3 text-base">쇼핑 계속하기</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">장바구니</h1>

        <div className="flex gap-6 items-start">
          {/* 왼쪽: 상품 목록 */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* 무료배송 프로그레스 */}
            {freeShippingRemain > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold text-red-600">{freeShippingRemain.toLocaleString()}원</span> 더 담으면 무료배송!
                  </span>
                  <span className="text-xs text-gray-400">5만원 이상 무료배송</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (subtotal / 50000) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {subtotal >= 50000 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
                <span className="text-green-600 text-lg">🎉</span>
                <span className="text-sm text-green-700 font-medium">무료배송 달성! 배송비가 무료입니다.</span>
              </div>
            )}

            {/* 전체선택 */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm font-medium text-gray-700">전체선택 ({selectedItems.size}/{items.length})</span>
                </label>
                <button
                  onClick={() => { if (confirm('선택한 상품을 삭제하시겠습니까?')) selectedItems.forEach(id => removeItem(id)); }}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  선택삭제
                </button>
              </div>
            </div>

            {/* 상품 목록 */}
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.productId} className="p-4 flex gap-4 group">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.productId)}
                    onChange={() => toggleItem(item.productId)}
                    className="mt-1 w-4 h-4 accent-red-600 flex-shrink-0"
                  />
                  <div
                    className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 cursor-pointer"
                    onClick={() => router.push(`/products/${item.productId}`)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-medium text-gray-900 line-clamp-2 cursor-pointer hover:text-red-600 transition-colors"
                      onClick={() => router.push(`/products/${item.productId}`)}
                    >
                      {item.name}
                    </h3>
                    <p className="text-xs text-green-600 mt-1">🚀 로켓배송</p>
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      {/* 수량 조절 */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => item.quantity > 1 ? updateQuantity(item.productId, item.quantity - 1) : removeItem(item.productId)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors font-bold"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors font-bold"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-gray-900">{(item.price * item.quantity).toLocaleString()}원</span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">쿠폰 적용</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                  placeholder="쿠폰 코드를 입력하세요"
                  className="flex-1 form-input text-sm"
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading}
                  className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
                >
                  {couponLoading ? '확인중...' : '적용'}
                </button>
              </div>
              {couponDiscount > 0 && (
                <p className="text-sm text-green-600 mt-2">✓ 쿠폰 {couponDiscount.toLocaleString()}원 할인 적용됨</p>
              )}
            </div>
          </div>

          {/* 오른쪽: 주문 요약 */}
          <div className="w-80 flex-shrink-0 sticky top-[156px]">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 text-lg mb-4">주문 요약</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>상품금액</span>
                  <span>{subtotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className={shippingFee === 0 && subtotal > 0 ? 'text-green-600 font-medium' : ''}>
                    {subtotal === 0 ? '-' : shippingFee === 0 ? '무료' : `+${shippingFee.toLocaleString()}원`}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>쿠폰할인</span>
                    <span>-{discount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
                  <span>총 결제금액</span>
                  <span className="text-red-600 text-xl">{total.toLocaleString()}원</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedItems.size === 0}
                className="mt-5 w-full btn-primary py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedItems.size > 0 ? `${selectedItems.size}개 상품 주문하기` : '상품을 선택하세요'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">안전결제 · SSL 암호화 · 개인정보 보호</p>
            </div>

            {/* 혜택 안내 */}
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-red-700">LiveMart 혜택</p>
              <p className="text-xs text-red-600">🚀 5만원 이상 무료배송</p>
              <p className="text-xs text-red-600">💳 카드결제 최대 5% 할인</p>
              <p className="text-xs text-red-600">🎁 신규회원 3,000원 쿠폰 증정</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
