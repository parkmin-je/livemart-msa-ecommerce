'use client';

import { GlobalNav } from '@/components/GlobalNav';
import { CartSummary } from '@/components/CartSummary';
import { ProductList } from '@/components/ProductList';
import { useState } from 'react';

const CATEGORIES = [
  { id: undefined, label: '전체' },
  { id: 1, label: '전자기기' },
  { id: 2, label: '패션' },
  { id: 3, label: '식품' },
  { id: 4, label: '홈/리빙' },
  { id: 5, label: '뷰티' },
  { id: 6, label: '스포츠' },
];

export default function ProductsPage() {
  const [selectedCat, setSelectedCat] = useState<number | undefined>(undefined);

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-5">
        <div className="flex gap-6 items-start">
          {/* 사이드바 */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-[148px]">
              <h3 className="font-bold text-gray-900 mb-4">카테고리</h3>
              <div className="space-y-1">
                {CATEGORIES.map(c => (
                  <button
                    key={String(c.id)}
                    onClick={() => setSelectedCat(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCat === c.id ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* 상품 목록 */}
          <div className="flex-1 min-w-0">
            {/* 모바일 카테고리 칩 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 lg:hidden">
              {CATEGORIES.map(c => (
                <button
                  key={String(c.id)}
                  onClick={() => setSelectedCat(c.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedCat === c.id ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <ProductList categoryId={selectedCat} pageSize={20} />
          </div>
        </div>
      </div>
      <CartSummary />
    </main>
  );
}
