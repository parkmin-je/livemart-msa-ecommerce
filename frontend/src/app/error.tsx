'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">&#x26A0;&#xFE0F;</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#0E0E0E' }}>
          문제가 발생했습니다
        </h2>
        <p className="mb-6" style={{ color: 'rgba(14,14,14,0.55)' }}>
          일시적인 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        {error.digest && (
          <p className="text-xs mb-4" style={{ color: 'rgba(14,14,14,0.35)' }}>오류 코드: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 text-white transition-colors"
            style={{ background: '#0A0A0A' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
          >
            다시 시도
          </button>
          <a
            href="/"
            className="px-6 py-2 transition-colors"
            style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.65)' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
