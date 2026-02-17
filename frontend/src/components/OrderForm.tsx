'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { orderApi, paymentApi, couponApi } from '@/api/productApi';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface CouponDiscount {
  couponCode: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

interface ApiError {
  response?: { data?: { message?: string } };
}

export function OrderForm() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    userId: typeof window !== 'undefined' ? parseInt(localStorage.getItem('userId') || '1') : 1,
    deliveryAddress: '',
    phoneNumber: '',
    orderNote: '',
    paymentMethod: 'CARD',
  });

  // 쿠폰 상태
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<CouponDiscount | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalAmount = couponDiscount ? couponDiscount.finalAmount : totalAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('쿠폰 코드를 입력해주세요.');
      return;
    }

    setCouponLoading(true);
    try {
      const preview = await couponApi.previewDiscount(couponCode, totalAmount);
      setCouponDiscount(preview);
      toast.success(`쿠폰 적용 완료! ${preview.discountAmount.toLocaleString()}원 할인`);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Coupon apply failed:', error);
      toast.error(error.response?.data?.message || '유효하지 않은 쿠폰입니다.');
      setCouponDiscount(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(null);
    toast.success('쿠폰이 제거되었습니다.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('장바구니가 비어있습니다.');
      return;
    }

    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast.error('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        ...formData,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        ...(couponDiscount ? { couponCode } : {}),
      };

      const response = await orderApi.createOrder(orderData);
      toast.success('주문 생성 완료! 결제를 진행합니다...');

      try {
        await paymentApi.processPayment({
          orderNumber: response.orderNumber,
          userId: formData.userId,
          amount: finalAmount,
          method: formData.paymentMethod,
        });
        toast.success(`결제가 완료되었습니다! 주문번호: ${response.orderNumber}`);
      } catch (paymentErr: unknown) {
        console.error('Payment failed:', paymentErr);
        toast.error('결제에 실패했습니다. 주문 상세에서 다시 시도해주세요.');
      }

      clearCart();

      setTimeout(() => {
        router.push(`/orders/${response.id}`);
      }, 1500);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Order creation failed:', error);
      toast.error(error.response?.data?.message || '주문 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">주문하기</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">배송 정보</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배송지 주소 *
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="서울시 강남구 테헤란로 123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연락처 *
              </label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="010-1234-5678"
              />
              <p className="text-xs text-gray-500 mt-1">형식: 010-1234-5678</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주문 메모
              </label>
              <textarea
                maxLength={500}
                value={formData.orderNote}
                onChange={(e) => setFormData({ ...formData, orderNote: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                rows={3}
                placeholder="배송 시 요청사항을 입력해주세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                결제 방법 *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="CARD">신용카드</option>
                <option value="BANK_TRANSFER">계좌이체</option>
                <option value="VIRTUAL_ACCOUNT">가상계좌</option>
                <option value="PHONE">휴대폰 결제</option>
              </select>
            </div>

            {/* 쿠폰 적용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                쿠폰 코드
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!couponDiscount}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                  placeholder="쿠폰 코드 입력"
                />
                {couponDiscount ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors text-sm"
                  >
                    {couponLoading ? '확인중...' : '적용'}
                  </button>
                )}
              </div>
              {couponDiscount && (
                <p className="text-sm text-green-600 mt-1 font-medium">
                  {couponDiscount.discountAmount.toLocaleString()}원 할인 적용됨
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '주문 처리 중...' : `${finalAmount.toLocaleString()}원 결제하기`}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">주문 상품</h2>

          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">장바구니가 비어있습니다.</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center space-x-4 pb-4 border-b">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        &#x1F4E6;
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {item.price.toLocaleString()}원 x {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {(item.price * item.quantity).toLocaleString()}원
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-gray-600">
                  <span>상품 금액</span>
                  <span>{totalAmount.toLocaleString()}원</span>
                </div>
                {couponDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>쿠폰 할인</span>
                    <span>-{couponDiscount.discountAmount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className="text-green-600">무료</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>총 결제 금액</span>
                  <span className="text-blue-600">{finalAmount.toLocaleString()}원</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
