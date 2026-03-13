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
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <section className="bg-white px-5 py-6 border-t border-gray-100">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">최근 본 상품</h2>
        <span className="text-xs text-gray-400">{recentProducts.length}개</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {recentProducts.slice(0, 12).map((product: Product) => (
          <a
            key={product.id}
            href={`/products/${product.id}`}
            className="flex-none w-24 group"
          >
            <div className="aspect-square overflow-hidden bg-gray-100 mb-2 border border-gray-100 group-hover:border-gray-200 transition-colors">
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
                      placeholder.className = 'w-full h-full bg-gray-100 flex items-center justify-center';
                      placeholder.innerHTML = `<svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
                      parent.appendChild(placeholder);
                    }
                  }}
                />
              ) : (
                <ImagePlaceholder />
              )}
            </div>
            <p className="text-xs text-gray-700 line-clamp-2 leading-snug mb-1 group-hover:text-red-600 transition-colors">
              {product.name}
            </p>
            <p className="text-xs font-bold text-gray-900 tabular-nums">
              {product.price?.toLocaleString()}
              <span className="font-normal text-gray-500 ml-0.5">원</span>
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
