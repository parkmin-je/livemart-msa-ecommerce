'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';

export default function AdminCouponsPage() {
  const router = useRouter();
  useEffect(() => { router.push('/admin'); }, [router]);
  return (
    <main className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>쿠폰 관리 페이지로 이동 중...</p>
      </div>
    </main>
  );
}
