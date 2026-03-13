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

  const selectedLabel = CATEGORIES.find(c => c.id === selectedCat)?.label ?? '전체';

  return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Products</p>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">{selectedLabel}</h1>
            </div>
            {selectedCat !== undefined && (
              <button
                onClick={() => setSelectedCat(undefined)}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                필터 초기화
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="flex gap-7 items-start">
          {/* Sidebar — desktop only */}
          <aside className="w-52 flex-shrink-0 hidden lg:block">
            <div className="bg-white border border-gray-100 p-5 sticky top-[148px]">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">카테고리</h3>
              <div className="space-y-0.5">
                {CATEGORIES.map(c => (
                  <button
                    key={String(c.id)}
                    onClick={() => setSelectedCat(c.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                      selectedCat === c.id
                        ? 'bg-gray-950 text-white font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span>{c.label}</span>
                    {selectedCat === c.id && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile: horizontal chip strip */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 lg:hidden -mx-1 px-1">
              {CATEGORIES.map(c => (
                <button
                  key={String(c.id)}
                  onClick={() => setSelectedCat(c.id)}
                  className={`flex-shrink-0 px-4 py-1.5 text-xs font-semibold border transition-colors ${
                    selectedCat === c.id
                      ? 'bg-gray-950 text-white border-gray-950'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
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
