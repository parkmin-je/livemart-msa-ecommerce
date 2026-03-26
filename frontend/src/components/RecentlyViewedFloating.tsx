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
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      {/* 슬라이드업 패널 */}
      {open && (
        <div
          className="shadow-2xl w-64 max-h-96 flex flex-col overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(14,14,14,0.12)',
            animation: 'slideUp 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
            <div>
              <span className="text-sm font-bold" style={{ color: '#0E0E0E' }}>오늘 본 상품</span>
              <span className="text-xs ml-1" style={{ color: 'rgba(14,14,14,0.4)' }}>({products.length})</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center transition-colors"
              style={{ color: 'rgba(14,14,14,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.4)')}
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
                className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
                style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-12 h-12 flex-shrink-0 overflow-hidden" style={{ background: '#F5F4F0' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2 leading-snug" style={{ color: '#0E0E0E' }}>{p.name}</p>
                  <p className="text-xs font-bold mt-1 tabular-nums" style={{ color: 'rgba(14,14,14,0.7)' }}>{p.price.toLocaleString()}원</p>
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(14,14,14,0.07)' }}>
            <button
              onClick={() => {
                try { localStorage.removeItem('recentlyViewed'); } catch {}
                setProducts([]);
                setOpen(false);
              }}
              className="text-xs transition-colors w-full text-center"
              style={{ color: 'rgba(14,14,14,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.4)')}
            >
              목록 비우기
            </button>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:-translate-y-0.5 relative"
        style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.12)' }}
        title="오늘 본 상품"
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.12)')}
      >
        <svg className="w-5 h-5" style={{ color: 'rgba(14,14,14,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-[9px] font-bold leading-none" style={{ color: 'rgba(14,14,14,0.5)' }}>본상품</span>
        <span className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none" style={{ background: '#E8001D' }}>
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
