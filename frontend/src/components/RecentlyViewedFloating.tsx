'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RecentProduct {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
}

export function RecentlyViewedFloating() {
  const router = useRouter();
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem('recentlyViewed');
        if (stored) {
          const parsed = JSON.parse(stored);
          setProducts(parsed.slice(0, 10));
        }
      } catch {}
    };
    load();
    // storage 이벤트로 다른 탭 변경 반영
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      {/* 슬라이드업 패널 */}
      {open && (
        <div
          className="bg-white border border-gray-200 shadow-2xl w-64 max-h-96 flex flex-col overflow-hidden"
          style={{
            animation: 'slideUp 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div>
              <span className="text-sm font-bold text-gray-900">오늘 본 상품</span>
              <span className="text-xs text-gray-400 ml-1">({products.length})</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => { router.push(`/products/${p.id}`); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <div className="w-12 h-12 bg-gray-100 flex-shrink-0 overflow-hidden">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
                  <p className="text-xs font-bold text-gray-900 mt-1 tabular-nums">{p.price.toLocaleString()}원</p>
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => {
                try { localStorage.removeItem('recentlyViewed'); } catch {}
                setProducts([]);
                setOpen(false);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors w-full text-center"
            >
              목록 비우기
            </button>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 bg-white border border-gray-200 shadow-lg flex flex-col items-center justify-center gap-0.5 hover:border-gray-400 transition-all hover:-translate-y-0.5 relative"
        title="오늘 본 상품"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-[9px] font-bold text-gray-500 leading-none">본상품</span>
        {/* 카운트 뱃지 */}
        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
          {products.length > 9 ? '9+' : products.length}
        </span>
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
