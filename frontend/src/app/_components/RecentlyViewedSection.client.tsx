'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
}

function ImagePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#F0EEE7' }}>
      <svg className="w-7 h-7" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

export function RecentlyViewedSection() {
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) setRecentProducts(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  if (recentProducts.length === 0) return null;

  return (
    <section
      className="px-5 py-6"
      style={{ background: '#FFFFFF', borderTop: '1px solid rgba(14,14,14,0.06)' }}
    >
      <div className="flex items-end justify-between mb-4">
        <h2
          className="tracking-tight"
          style={{ fontSize: '17px', fontWeight: 700, color: '#0E0E0E' }}
        >
          최근 본 상품
        </h2>
        <span style={{ fontSize: '12px', color: 'rgba(14,14,14,0.35)' }}>{recentProducts.length}개</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {recentProducts.slice(0, 12).map((product: Product) => (
          <a
            key={product.id}
            href={`/products/${product.id}`}
            className="flex-none w-24 group"
          >
            <div
              className="aspect-square overflow-hidden mb-2 transition-colors"
              style={{ border: '1px solid rgba(14,14,14,0.07)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.18)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.07)')}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const placeholder = document.createElement('div');
                      placeholder.className = 'w-full h-full flex items-center justify-center';
                      placeholder.style.background = '#F0EEE7';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
              ) : (
                <ImagePlaceholder />
              )}
            </div>
            <p
              className="text-xs line-clamp-2 leading-snug mb-1 transition-colors"
              style={{ color: 'rgba(14,14,14,0.65)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#E8001D')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(14,14,14,0.65)')}
            >
              {product.name}
            </p>
            <p className="text-xs font-bold tabular-nums" style={{ color: '#0E0E0E' }}>
              {product.price?.toLocaleString()}
              <span className="font-normal ml-0.5" style={{ color: 'rgba(14,14,14,0.4)' }}>원</span>
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
