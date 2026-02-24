'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';

export default function AdminCouponsPage() {
  const router = useRouter();
  useEffect(() => { router.push('/admin'); }, []);
  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <p className="text-gray-500">쿠폰 관리 페이지로 이동 중...</p>
      </div>
    </main>
  );
}
