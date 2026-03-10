'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId?: number;
}

const FLASH_DISCOUNTS = [20, 30, 25, 35, 40, 45, 50, 28];

export function FlashSaleSection({ products }: { products: Product[] }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const now = new Date();
    const end = new Date(now);
    const nextBoundary = Math.ceil(now.getHours() / 6) * 6;
    end.setHours(nextBoundary, 0, 0, 0);
    if (end <= now) end.setHours(end.getHours() + 6);

    const tick = () => {
      const diff = Math.max(0, end.getTime() - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const flashProducts = products.slice(0, 8).map((p, i) => ({
    ...p,
    flashDiscount: FLASH_DISCOUNTS[i % FLASH_DISCOUNTS.length],
  }));

  if (flashProducts.length === 0) return null;

  return (
    <section className="bg-white overflow-hidden">
      <div className="bg-red-600 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <h2 className="text-base font-bold text-white leading-none">번개특가</h2>
            <p className="text-white/70 text-xs mt-0.5">오늘만 특별 할인</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/60 text-xs mr-1.5">종료까지</span>
          {[timeLeft.h, timeLeft.m, timeLeft.s].map((v, i) => (
            <span key={i} className="flex items-center">
              <span className="bg-black/25 text-white font-bold text-sm w-8 h-8 flex items-center justify-center rounded tabular-nums">
                {String(v).padStart(2, '0')}
              </span>
              {i < 2 && <span className="text-white/60 font-bold text-sm mx-0.5">:</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-3 pb-1">
          {flashProducts.map((product) => {
            const originalPrice =
              Math.round(product.price / (1 - product.flashDiscount / 100) / 100) * 100;
            return (
              <a key={product.id} href={`/products/${product.id}`}
                className="flex-none w-32 group cursor-pointer">
                <div className="aspect-square overflow-hidden bg-gray-100 mb-2 relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <span className="text-xl font-bold text-gray-400">{product.name?.[0] || '상'}</span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">
                    -{product.flashDiscount}%
                  </span>
                </div>
                <p className="text-xs text-gray-700 line-clamp-2 font-medium leading-snug mb-1 group-hover:text-red-600 transition-colors">
                  {product.name}
                </p>
                <p className="text-xs text-gray-400 line-through">{originalPrice.toLocaleString()}원</p>
                <p className="text-sm font-bold text-red-600">{product.price.toLocaleString()}원</p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
