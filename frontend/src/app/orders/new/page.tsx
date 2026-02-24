'use client';

import { GlobalNav } from '@/components/GlobalNav';
import { OrderForm } from '@/components/OrderForm';

export default function NewOrderPage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">주문/결제</h1>
        <OrderForm />
      </div>
    </main>
  );
}
