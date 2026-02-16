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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          문제가 발생했습니다
        </h2>
        <p className="text-gray-600 mb-6">
          일시적인 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">오류 코드: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
