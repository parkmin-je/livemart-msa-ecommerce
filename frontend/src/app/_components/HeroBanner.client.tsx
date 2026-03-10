'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BANNERS = [
  {
    id: 1,
    tag: '봄 맞이 특가',
    title: '인기 상품\n최대 30% 할인',
    cta: '지금 쇼핑하기',
    href: '/products',
    bg: '#111827',
    accent: '#E11D48',
  },
  {
    id: 2,
    tag: '무료 배송 혜택',
    title: '5만원 이상\n무료배송',
    cta: '상품 보기',
    href: '/products',
    bg: '#0f2240',
    accent: '#3B82F6',
  },
  {
    id: 3,
    tag: '신상품 입고',
    title: '봄 시즌\n신상 컬렉션',
    cta: '신상품 보기',
    href: '/products',
    bg: '#1e1040',
    accent: '#7C3AED',
  },
];

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % BANNERS.length), 4500);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[current];

  return (
    <div
      className="relative overflow-hidden h-56 md:h-72 transition-colors duration-700"
      style={{ backgroundColor: banner.bg }}
    >
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full opacity-20 transition-colors duration-700"
        style={{ backgroundColor: banner.accent }} />
      <div className="absolute right-12 bottom-0 w-44 h-44 rounded-full opacity-10 translate-y-1/3 transition-colors duration-700"
        style={{ backgroundColor: banner.accent }} />
      <div className="absolute right-6 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full opacity-15 transition-colors duration-700"
        style={{ backgroundColor: banner.accent }} />

      <div className="relative z-10 h-full flex items-center">
        <div className="px-8 md:px-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3 transition-colors duration-500"
            style={{ color: banner.accent }}>
            {banner.tag}
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-white leading-[1.2] mb-5 whitespace-pre-line">
            {banner.title}
          </h2>
          <button
            onClick={() => router.push(banner.href)}
            className="bg-white text-gray-900 font-semibold px-5 py-2.5 text-sm rounded hover:bg-gray-100 transition-colors"
          >
            {banner.cta} →
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-8 flex items-center gap-1.5">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`transition-all rounded-full ${i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60'}`}
          />
        ))}
      </div>

      <button onClick={() => setCurrent(c => (c - 1 + BANNERS.length) % BANNERS.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button onClick={() => setCurrent(c => (c + 1) % BANNERS.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
