'use client';

import { GlobalNav } from '@/components/GlobalNav';
import { OrderList } from '@/components/OrderList';

export default function MyOrdersPage() {
  return (
    <main className="min-h-screen bg-gray-100 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">주문 내역</h1>
        <OrderList />
      </div>
    </main>
  );
}
