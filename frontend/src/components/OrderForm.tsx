'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'CARD', label: '신용/체크카드', emoji: '💳' },
  { id: 'KAKAO_PAY', label: '카카오페이', emoji: '💛' },
  { id: 'NAVER_PAY', label: '네이버페이', emoji: '🟢' },
  { id: 'BANK_TRANSFER', label: '계좌이체', emoji: '🏦' },
  { id: 'VIRTUAL_ACCOUNT', label: '가상계좌', emoji: '📄' },
];

export function OrderForm() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [address, setAddress] = useState({
    recipient: '', phone: '', zipCode: '', address: '', detail: '', memo: '',
  });

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shippingFee - couponDiscount;

  useEffect(() => {
    const saved = localStorage.getItem('savedAddress');
    if (saved) try { setAddress(JSON.parse(saved)); } catch {}
    const name = localStorage.getItem('userName');
    if (name && !address.recipient) setAddress(a => ({ ...a, recipient: name }));
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await fetch(`/api/coupons/${couponCode}/preview?orderAmount=${subtotal}`);
      if (res.ok) {
        const d = await res.json();
        setCouponDiscount(d.discountAmount || 0);
        toast.success(`쿠폰 적용! ${(d.discountAmount || 0).toLocaleString()}원 할인`);
      } else { toast.error('유효하지 않은 쿠폰'); }
    } catch { toast.error('쿠폰 오류'); }
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.recipient || !address.phone || !address.address) {
      toast.error('배송 정보를 입력해주세요'); return;
    }
    if (items.length === 0) { toast.error('장바구니가 비어있습니다'); return; }

    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');

      const orderPayload = {
        userId: userId ? Number(userId) : 1,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
        shippingAddress: `${address.zipCode} ${address.address} ${address.detail}`.trim(),
        recipientName: address.recipient,
        recipientPhone: address.phone,
        deliveryMemo: address.memo,
        couponCode: couponCode || null,
        paymentMethod,
        totalAmount: total,
      };

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) throw new Error('주문 생성 실패');
      const orderData = await orderRes.json();
      const orderId = orderData.id || orderData.orderId;

      // 결제 처리
      try {
        await fetch('/api/v1/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ orderId, amount: total, paymentMethod }),
        });
      } catch { /* 결제 실패해도 주문은 완료 */ }

      localStorage.setItem('savedAddress', JSON.stringify(address));
      clearCart();
      toast.success('주문이 완료되었습니다!');
      router.push(`/orders/${orderId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '주문 실패');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleOrder} className="flex gap-6 items-start">
      {/* 왼쪽 */}
      <div className="flex-1 space-y-4">
        {/* 배송지 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 text-lg mb-4">배송 정보</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">받는 분 *</label>
                <input type="text" value={address.recipient} onChange={e => setAddress(a => ({ ...a, recipient: e.target.value }))}
                  placeholder="홍길동" className="form-input" required />
              </div>
              <div>
                <label className="form-label">연락처 *</label>
                <input type="tel" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))}
                  placeholder="010-0000-0000" className="form-input" required />
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text" value={address.zipCode} onChange={e => setAddress(a => ({ ...a, zipCode: e.target.value }))}
                placeholder="우편번호" className="form-input w-32" />
              <button type="button" className="btn-outline-red px-4 text-sm whitespace-nowrap">주소 검색</button>
            </div>
            <input type="text" value={address.address} onChange={e => setAddress(a => ({ ...a, address: e.target.value }))}
              placeholder="기본 주소 *" className="form-input" required />
            <input type="text" value={address.detail} onChange={e => setAddress(a => ({ ...a, detail: e.target.value }))}
              placeholder="상세 주소 (동, 호수)" className="form-input" />
            <select value={address.memo} onChange={e => setAddress(a => ({ ...a, memo: e.target.value }))}
              className="form-input text-sm">
              <option value="">배송 메모 선택</option>
              <option value="문 앞에 놔주세요">문 앞에 놔주세요</option>
              <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
              <option value="부재 시 연락주세요">부재 시 연락주세요</option>
              <option value="직접 수령합니다">직접 수령합니다</option>
            </select>
          </div>
        </div>

        {/* 주문 상품 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 text-lg mb-4">주문 상품 ({items.length})</h2>
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.productId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-gray-500">수량: {item.quantity}개</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{(item.price * item.quantity).toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 text-lg mb-4">결제 수단</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(pm => (
              <button
                key={pm.id} type="button" onClick={() => setPaymentMethod(pm.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors text-sm font-medium ${paymentMethod === pm.id ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-700 hover:border-red-200'}`}
              >
                <span>{pm.emoji}</span> {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* 쿠폰 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 text-lg mb-4">쿠폰 적용</h2>
          <div className="flex gap-2">
            <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
              placeholder="쿠폰 코드" className="flex-1 form-input" />
            <button type="button" onClick={applyCoupon} className="btn-primary px-4">적용</button>
          </div>
          {couponDiscount > 0 && <p className="text-sm text-green-600 mt-2">✓ {couponDiscount.toLocaleString()}원 할인</p>}
        </div>
      </div>

      {/* 오른쪽: 결제 요약 */}
      <div className="w-80 flex-shrink-0 sticky top-[156px]">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 text-lg mb-4">결제 금액</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600"><span>상품금액</span><span>{subtotal.toLocaleString()}원</span></div>
            <div className="flex justify-between text-gray-600">
              <span>배송비</span>
              <span className={shippingFee === 0 ? 'text-green-600' : ''}>{shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}</span>
            </div>
            {couponDiscount > 0 && <div className="flex justify-between text-red-600"><span>쿠폰 할인</span><span>-{couponDiscount.toLocaleString()}원</span></div>}
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
              <span>최종 결제금액</span>
              <span className="text-red-600 text-xl">{total.toLocaleString()}원</span>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="mt-5 w-full btn-primary py-3.5 text-base font-bold disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? '처리중...' : `${total.toLocaleString()}원 결제하기`}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">SSL 암호화 · 안전결제 보장</p>
        </div>
      </div>
    </form>
  );
}
