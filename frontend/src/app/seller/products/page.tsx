'use client';

import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import { useEffect } from 'react';

export default function SellerProductsPage() {
  const router = useRouter();

  useEffect(() => {
    // 판매자 메인 페이지의 products 탭으로 리다이렉트
    router.push('/seller');
  }, [router]);

  return (
    <main className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>리다이렉트 중...</p>
      </div>
    </main>
  );
}
