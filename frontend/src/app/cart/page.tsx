'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import { couponApi } from '@/api/productApi';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

interface CouponDiscount {
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number;
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalAmount } = useCartStore();

  const totalAmount = getTotalAmount();
  const shippingFee = totalAmount >= 50000 ? 0 : 3000;

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDiscount | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('쿠폰 코드를 입력해주세요.');
      return;
    }
    setCouponLoading(true);
    try {
      const coupon = await couponApi.validate(couponCode, totalAmount);
      if (coupon && coupon.valid !== false) {
        setAppliedCoupon({
          code: couponCode,
          discountType: coupon.discountType || 'PERCENTAGE',
          discountValue: coupon.discountValue || 0,
          maxDiscountAmount: coupon.maxDiscountAmount,
        });
        toast.success(`쿠폰 적용! (${coupon.discountType === 'FIXED' ? `${coupon.discountValue?.toLocaleString()}원` : `${coupon.discountValue}%`} 할인)`);
      } else {
        toast.error('유효하지 않은 쿠폰입니다.');
      }
    } catch {
      toast.error('쿠폰 적용에 실패했습니다.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('쿠폰이 제거되었습니다.');
  };

  const calcDiscount = (): number => {
    if (!appliedCoupon) return 0;
    let discount = 0;
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      discount = Math.round(totalAmount * (appliedCoupon.discountValue / 100));
      if (appliedCoupon.maxDiscountAmount) discount = Math.min(discount, appliedCoupon.maxDiscountAmount);
    } else {
      discount = appliedCoupon.discountValue;
    }
    return Math.min(discount, totalAmount);
  };

  const discount = calcDiscount();
  const finalAmount = totalAmount - discount + shippingFee;

  return (
    <main className="min-h-screen bg-gray-50">
      <GlobalNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">장바구니</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-16 shadow-sm text-center">
            <div className="text-6xl mb-4">&#x1F6D2;</div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">장바구니가 비어있습니다</h2>
            <p className="text-gray-500 mb-6">마음에 드는 상품을 담아보세요!</p>
            <button onClick={() => router.push('/products')} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition">상품 둘러보기</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">총 {items.length}개 상품</span>
                <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700">전체 삭제</button>
              </div>

              {items.map((item) => (
                <div key={item.productId} className="bg-white rounded-xl p-6 shadow-sm flex gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => router.push(`/products/${item.productId}`)}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-3xl">&#x1F4E6;</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600" onClick={() => router.push(`/products/${item.productId}`)}>{item.name}</h3>
                    <div className="text-lg font-bold text-blue-600 mb-3">{item.price.toLocaleString()}원</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border rounded-lg">
                        <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="px-3 py-1 text-gray-600 hover:bg-gray-100">-</button>
                        <span className="px-3 py-1 font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100">+</button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-700">{(item.price * item.quantity).toLocaleString()}원</span>
                        <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 transition">&#x2715;</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-6">주문 요약</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600"><span>상품 금액</span><span>{totalAmount.toLocaleString()}원</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>쿠폰 할인</span><span>-{discount.toLocaleString()}원</span></div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>배송비</span>
                    <span className={shippingFee === 0 ? 'text-green-600' : ''}>{shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}</span>
                  </div>
                  {totalAmount < 50000 && <div className="text-xs text-gray-400">{(50000 - totalAmount).toLocaleString()}원 더 구매 시 무료배송</div>}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>총 결제 금액</span>
                    <span className="text-blue-600">{finalAmount.toLocaleString()}원</span>
                  </div>
                </div>

                {/* Coupon */}
                <div className="mb-6">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div>
                        <div className="text-sm font-medium text-green-700">{appliedCoupon.code}</div>
                        <div className="text-xs text-green-600">
                          {appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}%` : `${appliedCoupon.discountValue.toLocaleString()}원`} 할인 적용
                        </div>
                      </div>
                      <button onClick={removeCoupon} className="text-red-500 hover:text-red-700 text-sm">제거</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="쿠폰 코드 입력"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button onClick={applyCoupon} disabled={couponLoading} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition">
                        {couponLoading ? '...' : '적용'}
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={() => router.push('/orders')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition">
                  주문하기 ({items.reduce((sum, i) => sum + i.quantity, 0)}개)
                </button>
                <button onClick={() => router.push('/products')} className="w-full mt-3 text-gray-600 py-2 text-sm hover:text-blue-600 transition">계속 쇼핑하기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
