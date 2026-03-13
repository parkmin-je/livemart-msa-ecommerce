'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const BANNERS = [
  {
    id: 1,
    tag: '한정 특가',
    title: '최대\n30% 할인',
    sub: '베스트셀러 오늘만 특가',
    desc: '인기 상품 한정 수량 특별 할인',
    cta: '지금 쇼핑하기',
    href: '/products',
    bg: '#0D0D10',
    accent: '#EF4444',
    bigText: '30',
    bigUnit: '%',
    bigLabel: 'SALE',
    stat1: { label: '참여 중', value: '12,847명' },
    stat2: { label: '남은 수량', value: '한정' },
  },
  {
    id: 2,
    tag: '빠른 배송',
    title: '오늘 주문\n내일 도착',
    sub: '5만원 이상 무료배송',
    desc: '전 품목 로켓배송 적용',
    cta: '전체상품 보기',
    href: '/products',
    bg: '#080D1A',
    accent: '#3B82F6',
    bigText: '무료',
    bigUnit: '',
    bigLabel: '배송',
    stat1: { label: '평균 배송', value: '14시간' },
    stat2: { label: '만족도', value: '99.1%' },
  },
  {
    id: 3,
    tag: '신상품 입고',
    title: '2026 S/S\n봄 컬렉션',
    sub: '트렌디한 신상품 총출동',
    desc: '이번 시즌 가장 주목받는 아이템',
    cta: '신상품 보기',
    href: '/products',
    bg: '#080F08',
    accent: '#22C55E',
    bigText: 'NEW',
    bigUnit: '',
    bigLabel: '입고',
    stat1: { label: '신상품', value: '247종' },
    stat2: { label: '오늘 입고', value: '32종' },
  },
];

const AUTO_INTERVAL = 5200;

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('left');
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  const startCycle = (idx: number) => {
    clearTimers();
    setProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      const p = Math.min(((Date.now() - start) / AUTO_INTERVAL) * 100, 100);
      setProgress(p);
    }, 16);
    timerRef.current = setInterval(() => {
      goNext(idx);
    }, AUTO_INTERVAL);
  };

  const goNext = (from: number) => {
    const next = (from + 1) % BANNERS.length;
    goTo(next, 'left');
  };

  const goTo = (i: number, dir: 'left' | 'right' = 'left') => {
    if (animating) return;
    clearTimers();
    setExitDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(i);
      setAnimating(false);
    }, 380);
  };

  useEffect(() => {
    startCycle(current);
    return clearTimers;
  }, [current]);

  const banner = BANNERS[current];

  return (
    <div
      className="relative overflow-hidden w-full select-none"
      style={{
        height: 'clamp(260px, 38vw, 520px)',
        background: banner.bg,
        transition: 'background 1s ease',
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute -left-32 top-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-[140px] pointer-events-none transition-all duration-1000"
        style={{ background: banner.accent, opacity: 0.18 }}
      />
      <div
        className="absolute right-0 bottom-0 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000"
        style={{ background: banner.accent, opacity: 0.06 }}
      />

      {/* Slide content */}
      <div
        className="absolute inset-0 flex"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating
            ? `translateX(${exitDir === 'left' ? '-4%' : '4%'})`
            : 'translateX(0)',
          transition: 'opacity 0.38s ease, transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {/* Left: text */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-14 lg:px-20 xl:px-28 z-10 pb-8">
          {/* Tag */}
          <div className="flex items-center gap-2.5 mb-5 md:mb-7">
            <span
              className="w-1 h-4 flex-shrink-0 rounded-full"
              style={{ background: banner.accent }}
            />
            <span
              className="text-[11px] font-extrabold uppercase tracking-[0.28em]"
              style={{ color: banner.accent }}
            >
              {banner.tag}
            </span>
          </div>

          {/* Title */}
          <h2
            className="font-black text-white leading-[0.98] tracking-tighter mb-4 md:mb-5"
            style={{
              fontSize: 'clamp(2.2rem, 4.8vw, 4.8rem)',
              whiteSpace: 'pre-line',
              textShadow: '0 4px 60px rgba(0,0,0,0.6)',
            }}
          >
            {banner.title}
          </h2>

          {/* Sub */}
          <p
            className="text-white/55 font-medium mb-1"
            style={{ fontSize: 'clamp(0.82rem, 1.4vw, 1rem)' }}
          >
            {banner.sub}
          </p>
          <p
            className="text-white/30 mb-7 md:mb-9"
            style={{ fontSize: 'clamp(0.72rem, 1.1vw, 0.85rem)' }}
          >
            {banner.desc}
          </p>

          {/* CTA */}
          <button
            onClick={() => router.push(banner.href)}
            className="inline-flex items-center gap-3 font-bold text-white text-sm transition-all duration-200 hover:gap-4 w-fit"
            style={{
              background: banner.accent,
              padding: 'clamp(10px,1.2vw,14px) clamp(20px,2.5vw,28px)',
              letterSpacing: '0.01em',
            }}
          >
            {banner.cta}
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right: big visual (lg+) */}
        <div className="hidden lg:flex flex-col items-center justify-center w-[40%] flex-shrink-0 relative z-10 pb-8">
          {/* Decorative rings */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
            style={{
              width: 'clamp(200px,18vw,300px)',
              height: 'clamp(200px,18vw,300px)',
              borderColor: banner.accent,
              borderWidth: 1,
              opacity: 0.12,
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
            style={{
              width: 'clamp(270px,24vw,400px)',
              height: 'clamp(270px,24vw,400px)',
              borderColor: banner.accent,
              borderWidth: 1,
              opacity: 0.05,
            }}
          />

          {/* Big number */}
          <div className="text-center mb-6">
            <div
              className="font-black leading-none tabular-nums"
              style={{
                fontSize: 'clamp(4.5rem, 9.5vw, 9rem)',
                color: banner.accent,
                textShadow: `0 0 80px ${banner.accent}55`,
                letterSpacing: '-0.04em',
              }}
            >
              {banner.bigText}
              {banner.bigUnit && (
                <span style={{ fontSize: '0.42em', verticalAlign: 'super', letterSpacing: '-0.02em' }}>
                  {banner.bigUnit}
                </span>
              )}
            </div>
            <div className="text-white/25 text-[10px] font-bold uppercase tracking-[0.35em] mt-2">
              {banner.bigLabel}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-10">
            {[banner.stat1, banner.stat2].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-white font-black text-xl tabular-nums">{stat.value}</div>
                <div className="text-white/30 text-[11px] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar: indicators + arrows */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center px-8 md:px-14 lg:px-20 xl:px-28 pb-4 gap-4">
        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 flex-1">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 'left' : 'right')}
              className="transition-all duration-300 rounded-full flex-shrink-0"
              style={{
                width: i === current ? '24px' : '5px',
                height: '5px',
                background: i === current ? banner.accent : 'rgba(255,255,255,0.2)',
              }}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
          <span className="text-white/20 text-[10px] font-mono ml-1">
            {String(current + 1).padStart(2, '0')}/{String(BANNERS.length).padStart(2, '0')}
          </span>
        </div>

        {/* Arrow buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goTo((current - 1 + BANNERS.length) % BANNERS.length, 'right')}
            className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            aria-label="이전"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => goTo((current + 1) % BANNERS.length, 'left')}
            className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            aria-label="다음"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]">
        <div
          className="h-full"
          style={{ width: `${progress}%`, background: banner.accent, transition: 'none' }}
        />
      </div>
    </div>
  );
}
