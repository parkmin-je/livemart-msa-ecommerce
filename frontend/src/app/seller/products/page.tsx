'use client';

import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import { useEffect } from 'react';

export default function SellerProductsPage() {
  const router = useRouter();

  useEffect(() => {
    // 판매자 메인 페이지의 products 탭으로 리다이렉트
    router.push('/seller');
  }, []);

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <p className="text-gray-500">리다이렉트 중...</p>
      </div>
    </main>
  );
}
