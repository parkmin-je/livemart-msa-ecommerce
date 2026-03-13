'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BANNERS = [
  {
    id: 1,
    tag: '오늘의 특가',
    title: '최대 30%',
    sub: '베스트셀러 한정 특가',
    desc: '인기 상품 특별 할인 · 오늘만',
    cta: '지금 쇼핑하기',
    href: '/products',
    from: '#E11D48',
    to: '#BE123C',
    accent: '#ffffff',
    bigText: '30%',
    bigLabel: 'SALE',
  },
  {
    id: 2,
    tag: '빠른배송',
    title: '오늘 주문',
    sub: '내일 도착 보장',
    desc: '5만원 이상 무료배송 · 전 품목',
    cta: '전체상품 보기',
    href: '/products',
    from: '#1D4ED8',
    to: '#1E40AF',
    accent: '#93C5FD',
    bigText: '무료',
    bigLabel: '배송',
  },
  {
    id: 3,
    tag: '신상품 입고',
    title: '2026 S/S',
    sub: '봄 신상 컬렉션',
    desc: '새로 입고된 트렌디한 신상품',
    cta: '신상품 보기',
    href: '/products',
    from: '#16A34A',
    to: '#15803D',
    accent: '#86EFAC',
    bigText: 'NEW',
    bigLabel: '입고',
  },
];

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent(c => (c + 1) % BANNERS.length);
        setAnimating(false);
      }, 200);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const goTo = (i: number) => {
    setAnimating(true);
    setTimeout(() => { setCurrent(i); setAnimating(false); }, 150);
  };

  const banner = BANNERS[current];

  return (
    <div
      className="relative overflow-hidden h-52 md:h-72 transition-all duration-500"
      style={{ background: `linear-gradient(135deg, ${banner.from} 0%, ${banner.to} 100%)` }}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 12px)',
        }}
      />

      {/* Content */}
      <div
        className={`relative z-10 h-full flex items-center justify-between px-7 md:px-14 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* Left: text */}
        <div>
          <div
            className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            {banner.tag}
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.05] mb-1.5 tracking-tight">
            {banner.title}
          </h2>
          <p className="text-base md:text-lg font-semibold text-white/90 mb-0.5">{banner.sub}</p>
          <p className="text-xs text-white/60 mb-6">{banner.desc}</p>
          <button
            onClick={() => router.push(banner.href)}
            className="inline-flex items-center gap-2 bg-white font-bold px-5 py-2.5 text-sm rounded hover:opacity-90 transition-opacity"
            style={{ color: banner.from }}
          >
            {banner.cta}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right: big bold stat */}
        <div className="hidden md:flex flex-col items-center justify-center flex-shrink-0 w-44 h-44 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <span className="text-5xl font-black text-white leading-none tracking-tighter"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
            {banner.bigText}
          </span>
          <span className="text-sm font-semibold text-white/80 mt-1 tracking-wide">{banner.bigLabel}</span>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-7 md:left-14 flex items-center gap-2">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'}`}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
        <span className="text-white/30 text-[10px] font-mono ml-1">
          {current + 1}/{BANNERS.length}
        </span>
      </div>

      {/* Arrow controls */}
      <button
        onClick={() => goTo((current - 1 + BANNERS.length) % BANNERS.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center text-white transition-colors"
        aria-label="이전"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => goTo((current + 1) % BANNERS.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center text-white transition-colors"
        aria-label="다음"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
