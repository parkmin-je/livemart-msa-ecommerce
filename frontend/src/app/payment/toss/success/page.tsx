'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function TossSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setMessage('결제 정보가 올바르지 않습니다.');
      return;
    }

    fetch('/api/payments/toss/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
      .then(res => {
        if (!res.ok) throw new Error('결제 승인 실패');
        return res.json();
      })
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/my-orders'), 2000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || '결제 처리 중 오류가 발생했습니다.');
      });
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F7F6F1' }}>
        <div className="w-12 h-12 rounded-full animate-spin mb-4" style={{ border: '4px solid rgba(14,14,14,0.1)', borderTopColor: '#E8001D' }} />
        <p className="font-medium" style={{ color: 'rgba(14,14,14,0.6)' }}>결제 승인 처리 중...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F7F6F1' }}>
        <div className="shadow-sm p-10 text-center max-w-sm w-full mx-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <svg className="w-8 h-8" style={{ color: 'rgb(21,128,61)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>결제 완료</h1>
          <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>주문 내역 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F7F6F1' }}>
      <div className="shadow-sm p-10 text-center max-w-sm w-full mx-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(232,0,29,0.08)' }}>
          <svg className="w-8 h-8" style={{ color: '#E8001D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>결제 실패</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(14,14,14,0.5)' }}>{message}</p>
        <button
          onClick={() => router.back()}
          className="w-full py-3 text-white font-semibold text-sm transition-colors"
          style={{ background: '#0A0A0A' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

export default function TossSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F1' }}>
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '4px solid rgba(14,14,14,0.1)', borderTopColor: '#E8001D' }} />
      </div>
    }>
      <TossSuccessContent />
    </Suspense>
  );
}
