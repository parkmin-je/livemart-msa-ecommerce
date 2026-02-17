'use client';

import { GlobalNav } from '@/components/GlobalNav';
import { OrderList } from '@/components/OrderList';

export default function MyOrdersPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <GlobalNav />
      <OrderList />
    </main>
  );
}
