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

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="bg-gray-900 text-white font-black text-base w-9 h-9 flex items-center justify-center tabular-nums tracking-tight">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

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
    <section className="bg-white overflow-hidden border-t border-gray-100">
      {/* Header */}
      <div className="bg-gray-950 px-5 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-px h-8 bg-red-600" />
          <div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-sm font-black text-white tracking-tight uppercase">Flash Sale</h2>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">번개특가 · 오늘만 특별 할인</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider mr-1">종료까지</span>
          <TimeBlock value={timeLeft.h} label="시" />
          <span className="text-gray-700 font-black text-sm mb-4">:</span>
          <TimeBlock value={timeLeft.m} label="분" />
          <span className="text-gray-700 font-black text-sm mb-4">:</span>
          <TimeBlock value={timeLeft.s} label="초" />
        </div>
      </div>

      {/* Product list */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
          {flashProducts.map((product) => {
            const originalPrice =
              Math.round(product.price / (1 - product.flashDiscount / 100) / 100) * 100;
            return (
              <a
                key={product.id}
                href={`/products/${product.id}`}
                className="flex-none w-36 group cursor-pointer"
              >
                <div className="aspect-square overflow-hidden bg-gray-100 mb-2.5 relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Discount badge */}
                  <div className="absolute top-0 left-0 bg-red-600 text-white text-[11px] font-black px-2 py-1 leading-none">
                    -{product.flashDiscount}%
                  </div>
                </div>
                <p className="text-xs text-gray-700 line-clamp-2 font-medium leading-snug mb-1.5 group-hover:text-red-600 transition-colors">
                  {product.name}
                </p>
                <div>
                  <p className="text-[11px] text-gray-400 line-through tabular-nums">
                    {originalPrice.toLocaleString()}원
                  </p>
                  <p className="text-sm font-black text-gray-900 tabular-nums">
                    {product.price.toLocaleString()}
                    <span className="text-xs font-medium text-gray-500 ml-0.5">원</span>
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
