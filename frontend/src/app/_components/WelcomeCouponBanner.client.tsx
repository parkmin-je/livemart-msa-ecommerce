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
      toast.error('이미 수령한 쿠폰입니다');
      return;
    }
    localStorage.setItem(key, '1');
    setClaimed(true);
    navigator.clipboard.writeText(WELCOME_CODE).catch(() => {});
    toast.success(
      `쿠폰 코드가 복사되었습니다. 코드: ${WELCOME_CODE} — 주문 시 쿠폰 입력란에 붙여넣기 하세요`,
      { duration: 6000 }
    );
  };

  return (
    <button
      onClick={handleClick}
      className="group w-full text-left bg-gray-950 px-6 py-5 text-white hover:bg-gray-900 transition-colors flex items-center justify-between"
    >
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-2">
          Welcome Offer
        </div>
        <div className="font-bold text-base tracking-tight">신규 회원 혜택</div>
        <div className="text-sm text-gray-400 mt-1">
          {claimed
            ? '수령 완료 · 코드: WELCOME3000'
            : '가입 즉시 3,000원 쿠폰 지급'}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {claimed && (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <div className="w-10 h-10 rounded bg-white/8 border border-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
