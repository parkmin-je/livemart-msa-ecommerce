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
    const userId = searchParams.get('userId');
    const name = searchParams.get('name');
    const role = searchParams.get('role') || 'USER';
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

    if (userId) {
      // 토큰은 httpOnly 쿠키로 이미 설정됨 — 비민감 정보만 localStorage에 저장
      // searchParams.get()은 이미 URL 디코딩을 수행하므로 추가 decodeURIComponent 불필요
      localStorage.setItem('userId', userId);
      if (name) {
        try {
          localStorage.setItem('userName', decodeURIComponent(name));
        } catch {
          localStorage.setItem('userName', name);
        }
      }
      localStorage.setItem('userRole', role);

      const needOnboarding = searchParams.get('needOnboarding') === 'true';

      if (needOnboarding) {
        // 최초 소셜 로그인 → 추가 정보 입력 페이지로 이동
        setStatus('success');
        setMessage('추가 정보를 입력해주세요.');
        setTimeout(() => {
          window.location.href = '/auth/onboarding';
        }, 800);
      } else {
        setStatus('success');
        setMessage(`환영합니다, ${decodeURIComponent(name || '회원')}님!`);
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      }
    } else {
      setStatus('error');
      setMessage('로그인 정보가 없습니다. 다시 시도해주세요.');
      setTimeout(() => router.push('/auth'), 2500);
    }
  }, [searchParams, router]);

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
            <div className="flex justify-center mb-4"><svg className="w-14 h-14 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인 성공!</h2>
            <p className="text-gray-500 text-sm">{message}</p>
            <p className="text-xs text-gray-400 mt-2">홈으로 이동 중...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4"><svg className="w-14 h-14 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
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
