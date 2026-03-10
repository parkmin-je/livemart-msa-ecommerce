'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const WELCOME_CODE = 'WELCOME3000';

export function WelcomeCouponBanner() {
  const router = useRouter();
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId && localStorage.getItem(`welcome_coupon_${userId}`)) {
      setClaimed(true);
    }
  }, []);

  const handleClick = () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/auth');
      return;
    }
    const key = `welcome_coupon_${userId}`;
    if (localStorage.getItem(key)) {
      toast.error('이미 수령한 쿠폰입니다', { icon: '🎫' });
      return;
    }
    localStorage.setItem(key, '1');
    setClaimed(true);
    navigator.clipboard.writeText(WELCOME_CODE).catch(() => {});
    toast.success(
      `🎉 쿠폰 코드 복사 완료!\n코드: ${WELCOME_CODE}\n주문 시 쿠폰 입력란에 붙여넣기 하세요`,
      { duration: 6000 }
    );
  };

  return (
    <button
      onClick={handleClick}
      className="group w-full text-left bg-gray-950 px-6 py-5 text-white hover:bg-gray-800 transition-colors flex items-center justify-between"
    >
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-2">Welcome Offer</div>
        <div className="font-bold text-base">신규 회원 혜택</div>
        <div className="text-sm text-gray-400 mt-1">
          {claimed ? '✅ 쿠폰 수령 완료 · 코드: WELCOME3000' : '가입 즉시 3,000원 쿠폰 지급'}
        </div>
      </div>
      <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      </div>
    </button>
  );
}
