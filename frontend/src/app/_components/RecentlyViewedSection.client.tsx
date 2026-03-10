'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{title}</h2>
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
    <section className="bg-white px-5 py-5">
      <SectionHeader title="최근 본 상품" />
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {recentProducts.slice(0, 12).map((product: Product) => (
          <a key={product.id} href={`/products/${product.id}`}
            className="flex-none w-24 group">
            <div className="aspect-square overflow-hidden bg-gray-100 mb-1.5">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-lg font-bold text-gray-400">{product.name?.[0]}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-700 line-clamp-2 leading-snug mb-0.5 group-hover:text-red-600 transition-colors">
              {product.name}
            </p>
            <p className="text-xs font-bold text-gray-900">{product.price?.toLocaleString()}원</p>
          </a>
        ))}
      </div>
    </section>
  );
}
