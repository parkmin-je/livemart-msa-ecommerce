'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BANNERS = [
  {
    id: 1,
    tag: '봄 맞이 특가',
    title: '인기 상품\n최대 30% 할인',
    sub: '엄선된 베스트셀러 한정 특가',
    cta: '지금 쇼핑하기',
    href: '/products',
    bg: '#0a0a0a',
    accent: '#E11D48',
    grid: 'rgba(255,255,255,0.025)',
  },
  {
    id: 2,
    tag: '무료 배송 혜택',
    title: '5만원 이상\n무료배송',
    sub: '전 상품 무료배송 · 빠른 출고',
    cta: '상품 보기',
    href: '/products',
    bg: '#0f1629',
    accent: '#3B82F6',
    grid: 'rgba(59,130,246,0.05)',
  },
  {
    id: 3,
    tag: '신상품 입고',
    title: '봄 시즌\n신상 컬렉션',
    sub: '2026 S/S 신상품 전격 입고',
    cta: '신상품 보기',
    href: '/products',
    bg: '#0a0f0a',
    accent: '#16A34A',
    grid: 'rgba(22,163,74,0.04)',
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
      className="relative overflow-hidden h-64 md:h-80 transition-colors duration-700"
      style={{ backgroundColor: banner.bg }}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${banner.grid} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Thin horizontal rule accent */}
      <div
        className="absolute left-0 right-0 top-0 h-px transition-colors duration-700"
        style={{ backgroundColor: banner.accent, opacity: 0.6 }}
      />

      {/* Content layout: left text, right graphic */}
      <div className="relative z-10 h-full flex items-center justify-between px-8 md:px-14">
        {/* Left: editorial text block */}
        <div className="max-w-xs md:max-w-sm">
          <div
            className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] mb-4 px-2 py-1 border transition-colors duration-500"
            style={{ color: banner.accent, borderColor: banner.accent, opacity: 0.9 }}
          >
            {banner.tag}
          </div>
          <h2 className="text-2xl md:text-[2.4rem] font-black text-white leading-[1.1] mb-3 whitespace-pre-line tracking-tight">
            {banner.title}
          </h2>
          <p className="text-sm text-white/40 mb-6 tracking-wide">{banner.sub}</p>
          <button
            onClick={() => router.push(banner.href)}
            className="group flex items-center gap-2 bg-white text-gray-900 font-bold px-5 py-2.5 text-sm hover:bg-gray-50 transition-colors"
          >
            {banner.cta}
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right: abstract line grid art */}
        <div className="hidden md:block flex-shrink-0 relative w-52 h-52 opacity-20">
          {/* Concentric squares */}
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="absolute border transition-colors duration-700"
              style={{
                borderColor: banner.accent,
                inset: `${i * 18}px`,
                transform: `rotate(${i * 9}deg)`,
              }}
            />
          ))}
          {/* Center dot */}
          <div
            className="absolute inset-0 m-auto w-2 h-2 rounded-full transition-colors duration-700"
            style={{ backgroundColor: banner.accent }}
          />
        </div>
      </div>

      {/* Bottom nav: dots + slide counter */}
      <div className="absolute bottom-4 left-8 md:left-14 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`transition-all duration-300 rounded-full ${
                i === current ? 'w-6 h-1 bg-white' : 'w-1 h-1 bg-white/30 hover:bg-white/55'
              }`}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-white/25 text-[10px] font-mono tabular-nums">
          {String(current + 1).padStart(2, '0')} / {String(BANNERS.length).padStart(2, '0')}
        </span>
      </div>

      {/* Arrow controls */}
      <button
        onClick={() => setCurrent(c => (c - 1 + BANNERS.length) % BANNERS.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 border border-white/15 hover:border-white/40 flex items-center justify-center text-white/50 hover:text-white transition-all"
        aria-label="이전 슬라이드"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => setCurrent(c => (c + 1) % BANNERS.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 border border-white/15 hover:border-white/40 flex items-center justify-center text-white/50 hover:text-white transition-all"
        aria-label="다음 슬라이드"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
