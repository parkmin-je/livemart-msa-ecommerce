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
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F1' }}>
      <div className="shadow-sm p-10 text-center max-w-sm w-full mx-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 rounded-full animate-spin mx-auto mb-5" style={{ border: '4px solid rgba(232,0,29,0.15)', borderTopColor: '#E8001D' }} />
            <p className="font-medium" style={{ color: 'rgba(14,14,14,0.7)' }}>{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4"><svg className="w-14 h-14" style={{ color: 'rgb(21,128,61)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>로그인 성공!</h2>
            <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>{message}</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(14,14,14,0.35)' }}>홈으로 이동 중...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4"><svg className="w-14 h-14" style={{ color: '#E8001D' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>로그인 실패</h2>
            <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>{message}</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(14,14,14,0.35)' }}>잠시 후 로그인 페이지로...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F1' }}>
        <div className="w-14 h-14 rounded-full animate-spin" style={{ border: '4px solid rgba(232,0,29,0.15)', borderTopColor: '#E8001D' }} />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
