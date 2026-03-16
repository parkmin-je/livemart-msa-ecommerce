'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function TossFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message') || '결제가 취소되었습니다.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center max-w-sm w-full mx-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">결제 취소</h1>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <button onClick={() => router.back()}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors">
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
