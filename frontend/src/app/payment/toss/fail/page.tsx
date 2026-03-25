'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function TossFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message') || '결제가 취소되었습니다.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F7F6F1' }}>
      <div className="shadow-sm p-10 text-center max-w-sm w-full mx-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(234,179,8,0.1)' }}>
          <svg className="w-8 h-8" style={{ color: 'rgb(161,98,7)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>결제 취소</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(14,14,14,0.5)' }}>{message}</p>
        <button
          onClick={() => router.back()}
          className="w-full py-3 text-white font-semibold text-sm transition-colors"
          style={{ background: '#0A0A0A' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}

export default function TossFailPage() {
  return (
    <Suspense fallback={null}>
      <TossFailContent />
    </Suspense>
  );
}
