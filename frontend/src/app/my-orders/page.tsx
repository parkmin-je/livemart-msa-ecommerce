'use client';

import { GlobalNav } from '@/components/GlobalNav';
import { OrderList } from '@/components/OrderList';

export default function MyOrdersPage() {
  return (
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#0E0E0E' }}>주문 내역</h1>
        <OrderList />
      </div>
    </main>
  );
}
