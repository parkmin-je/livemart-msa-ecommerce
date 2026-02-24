'use client';

import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function CartSummary() {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const router = useRouter();

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const isFreeShipping = totalAmount >= 50000;
  const shippingFee = isFreeShipping ? 0 : 3000;

  if (items.length === 0) return null;

  return (
    <>
      {/* 플로팅 장바구니 버튼 */}
      <button
        onClick={() => router.push('/cart')}
        className="fixed bottom-8 right-8 bg-red-600 text-white rounded-2xl px-5 py-3.5 shadow-xl hover:bg-red-700 transition-all hover:scale-105 z-40 flex items-center gap-3 group"
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="absolute -top-2.5 -right-2.5 bg-white text-red-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-red-600 leading-none">
            {totalQty > 9 ? '9+' : totalQty}
          </span>
        </div>
        <div className="text-left">
          <div className="text-xs opacity-80 leading-none mb-0.5">장바구니</div>
          <div className="font-bold text-sm leading-none">{totalAmount.toLocaleString()}원</div>
        </div>
      </button>
    </>
  );
}
