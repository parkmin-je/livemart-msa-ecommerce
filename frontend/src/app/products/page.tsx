'use client';

import { GlobalNav } from '@/components/GlobalNav';
import { CartSummary } from '@/components/CartSummary';
import { ProductList } from '@/components/ProductList';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

const CATEGORIES = [
  { id: undefined, label: '전체' },
  { id: 1, label: '전자기기' },
  { id: 2, label: '패션' },
  { id: 3, label: '식품' },
  { id: 4, label: '홈/리빙' },
  { id: 5, label: '뷰티' },
  { id: 6, label: '스포츠' },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catParam = searchParams.get('cat');
  const initialCat = catParam ? parseInt(catParam) : undefined;
  const [selectedCat, setSelectedCat] = useState<number | undefined>(initialCat);

  useEffect(() => {
    const cat = searchParams.get('cat');
    setSelectedCat(cat ? parseInt(cat) : undefined);
  }, [searchParams]);

  const handleCatChange = (id: number | undefined) => {
    setSelectedCat(id);
    if (id) router.push(`/products?cat=${id}`, { scroll: false });
    else router.push('/products', { scroll: false });
  };

  const selectedLabel = CATEGORIES.find(c => c.id === selectedCat)?.label ?? '전체';

  return (
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      {/* Page header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          <div className="flex items-end justify-between">
            <div>
              <p
                className="uppercase tracking-widest mb-1"
                style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(14,14,14,0.35)' }}
              >
                Products
              </p>
              <h1
                className="font-bebas tracking-wide leading-none"
                style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#0E0E0E', letterSpacing: '0.04em' }}
              >
                {selectedLabel}
              </h1>
            </div>
            {selectedCat !== undefined && (
              <button
                onClick={() => handleCatChange(undefined)}
                className="flex items-center gap-1 transition-colors"
                style={{ fontSize: '12px', color: 'rgba(14,14,14,0.38)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.38)')}
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
          <aside className="w-48 flex-shrink-0 hidden lg:block">
            <div
              className="p-5 sticky top-[148px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
            >
              <h3
                className="uppercase tracking-widest mb-4"
                style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(14,14,14,0.35)' }}
              >
                카테고리
              </h3>
              <div className="space-y-0.5">
                {CATEGORIES.map(c => (
                  <button
                    key={String(c.id)}
                    onClick={() => handleCatChange(c.id)}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors"
                    style={{
                      background: selectedCat === c.id ? '#0A0A0A' : 'transparent',
                      color: selectedCat === c.id ? '#FFFFFF' : 'rgba(14,14,14,0.55)',
                      fontWeight: selectedCat === c.id ? 600 : 400,
                    }}
                    onMouseEnter={e => {
                      if (selectedCat !== c.id) {
                        e.currentTarget.style.background = 'rgba(14,14,14,0.04)';
                        e.currentTarget.style.color = '#0E0E0E';
                      }
                    }}
                    onMouseLeave={e => {
                      if (selectedCat !== c.id) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(14,14,14,0.55)';
                      }
                    }}
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
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 lg:hidden -mx-1 px-1 no-scrollbar">
              {CATEGORIES.map(c => (
                <button
                  key={String(c.id)}
                  onClick={() => handleCatChange(c.id)}
                  className="flex-shrink-0 px-4 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: selectedCat === c.id ? '#0A0A0A' : '#FFFFFF',
                    color: selectedCat === c.id ? '#FFFFFF' : 'rgba(14,14,14,0.55)',
                    border: selectedCat === c.id
                      ? '1px solid #0A0A0A'
                      : '1px solid rgba(14,14,14,0.14)',
                  }}
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
        <div className="h-[140px]" />
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <div
                  className="aspect-square"
                  style={{
                    background: 'linear-gradient(90deg, #EDEBE4 0%, #E4E1D8 50%, #EDEBE4 100%)',
                    backgroundSize: '600px 100%',
                    animation: 'shimmer 1.8s ease-in-out infinite',
                  }}
                />
                <div className="p-3 space-y-2">
                  <div className="h-3 animate-pulse" style={{ background: '#EDEBE4', width: '75%' }} />
                  <div className="h-3 animate-pulse" style={{ background: '#EDEBE4', width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    }>
      <ProductsContent />
    </Suspense>
  );
}
