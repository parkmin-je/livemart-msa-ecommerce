'use client';

import { GlobalNav } from '@/components/GlobalNav';
import { OrderForm } from '@/components/OrderForm';

export default function NewOrderPage() {
  return (
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#0E0E0E' }}>주문/결제</h1>
        <OrderForm />
      </div>
    </main>
  );
}
