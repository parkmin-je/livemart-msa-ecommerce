'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('소셜 로그인 처리 중...');

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const name = searchParams.get('name');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(
        error === 'oauth2_failed' ? '소셜 로그인에 실패했습니다' :
        error === 'email_not_found' ? '이메일 정보를 가져올 수 없습니다' :
        '로그인 처리 중 오류가 발생했습니다'
      );
      setTimeout(() => router.push('/auth'), 2500);
      return;
    }

    if (token && userId) {
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', userId);
      if (name) localStorage.setItem('userName', decodeURIComponent(name));

      // JWT payload에서 role 추출 후 저장 (관리자 메뉴 표시 용도)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('userRole', payload.role || 'USER');
      } catch {
        localStorage.setItem('userRole', 'USER');
      }

      const needOnboarding = searchParams.get('needOnboarding') === 'true';

      if (needOnboarding) {
        // 최초 소셜 로그인 → 추가 정보 입력 페이지로 이동
        setStatus('success');
        setMessage('추가 정보를 입력해주세요 ✍️');
        setTimeout(() => {
          window.location.href = '/auth/onboarding';
        }, 800);
      } else {
        setStatus('success');
        setMessage(`환영합니다, ${decodeURIComponent(name || '회원')}님! 🎉`);
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      }
    } else {
      setStatus('error');
      setMessage('토큰 정보가 없습니다. 다시 시도해주세요.');
      setTimeout(() => router.push('/auth'), 2500);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full mx-4">
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-5" />
            <p className="text-gray-700 font-medium">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인 성공!</h2>
            <p className="text-gray-500 text-sm">{message}</p>
            <p className="text-xs text-gray-400 mt-2">홈으로 이동 중...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인 실패</h2>
            <p className="text-gray-500 text-sm">{message}</p>
            <p className="text-xs text-gray-400 mt-2">잠시 후 로그인 페이지로...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
