'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { orderApi, paymentApi } from '@/api/productApi';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function OrderForm() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    userId: 1, // Mock user ID
    deliveryAddress: '',
    phoneNumber: '',
    orderNote: '',
    paymentMethod: 'CARD',
  });

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('장바구니가 비어있습니다.');
      return;
    }

    // Validate phone number format
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
      };

      const response = await orderApi.createOrder(orderData);
      toast.success(`주문 생성 완료! 결제를 진행합니다...`);

      // 결제 API 호출
      try {
        await paymentApi.processPayment({
          orderNumber: response.orderNumber,
          userId: formData.userId,
          amount: totalAmount,
          method: formData.paymentMethod,
        });
        toast.success(`결제가 완료되었습니다! 주문번호: ${response.orderNumber}`);
      } catch (paymentError: any) {
        console.error('Payment failed:', paymentError);
        toast.error('결제에 실패했습니다. 주문 상세에서 다시 시도해주세요.');
      }

      clearCart();

      setTimeout(() => {
        router.push(`/orders/${response.id}`);
      }, 1500);
    } catch (error: any) {
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

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '주문 처리 중...' : `${totalAmount.toLocaleString()}원 결제하기`}
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
                        📦
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {item.price.toLocaleString()}원 × {item.quantity}
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
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className="text-green-600">무료</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>총 결제 금액</span>
                  <span className="text-blue-600">{totalAmount.toLocaleString()}원</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feature Info */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">🚀 MSA 아키텍처 테스트 기능</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>✅ <strong>Saga Pattern</strong>: 주문 생성 시 Order → Inventory → Payment 순차 처리</li>
          <li>✅ <strong>분산 트랜잭션</strong>: 재고 차감 실패 시 자동 롤백 (Compensation)</li>
          <li>✅ <strong>비관적 락</strong>: 재고 동시성 제어 (Pessimistic Lock)</li>
          <li>✅ <strong>Kafka 이벤트</strong>: 주문 생성 시 이벤트 발행 → Analytics 수집</li>
          <li>✅ <strong>서비스 간 통신</strong>: RestTemplate을 통한 마이크로서비스 호출</li>
        </ul>
      </div>
    </div>
  );
}
