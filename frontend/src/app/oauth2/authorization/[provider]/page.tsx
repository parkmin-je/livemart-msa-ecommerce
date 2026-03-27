'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

const PROVIDER_NAMES: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  google: 'Google',
};

export default function OAuthDemoPage() {
  const router = useRouter();
  const params = useParams();
  const provider = typeof params.provider === 'string' ? params.provider : '';
  const name = PROVIDER_NAMES[provider] ?? provider;

  useEffect(() => {
    toast('소셜 로그인은 백엔드 서버 연동 시 사용 가능합니다.\n데모 계정으로 로그인해주세요.', {
      duration: 5000,
      icon: 'ℹ️',
    });
    const timer = setTimeout(() => router.replace('/auth'), 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F7F6F1' }}>
      <div className="text-center max-w-sm px-6 py-10" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.08)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(14,14,14,0.06)' }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgba(14,14,14,0.4)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 className="text-base font-semibold mb-2" style={{ color: '#0E0E0E' }}>{name} 로그인</h2>
        <p className="text-sm mb-1" style={{ color: 'rgba(14,14,14,0.6)' }}>
          소셜 로그인은 백엔드 서버가 연동된<br/>환경에서 사용 가능합니다.
        </p>
        <p className="text-xs mb-6" style={{ color: 'rgba(14,14,14,0.4)' }}>
          데모 계정으로 모든 기능을 체험할 수 있습니다.
        </p>
        <div className="p-3 mb-5 text-left" style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.08)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>데모 계정</p>
          <p className="text-sm font-mono" style={{ color: '#0E0E0E' }}>demo@livemart.com</p>
          <p className="text-sm font-mono" style={{ color: '#0E0E0E' }}>demo123</p>
        </div>
        <a href="/auth"
          className="block w-full py-2.5 text-sm font-semibold text-center text-white transition-colors"
          style={{ background: '#0A0A0A' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}>
          로그인 페이지로 돌아가기
        </a>
      </div>
    </div>
  );
}
