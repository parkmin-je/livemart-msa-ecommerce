'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    bg: '#0A0A0E',
    accent: '#EF4444',
    accentDim: 'rgba(239,68,68,0.18)',
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
    bg: '#06091A',
    accent: '#3B82F6',
    accentDim: 'rgba(59,130,246,0.16)',
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
    bg: '#050F08',
    accent: '#22C55E',
    accentDim: 'rgba(34,197,94,0.15)',
    bigText: 'NEW',
    bigUnit: '',
    bigLabel: '입고',
    stat1: { label: '신상품', value: '247종' },
    stat2: { label: '오늘 입고', value: '32종' },
  },
];

const TICKER_ITEMS = [
  '🔥 오늘의 핫딜 시작',
  '📦 무료배송 5만원 이상',
  '⚡ 플래시세일 23:59 마감',
  '🎁 신규가입 3,000원 쿠폰',
  '💎 VIP 회원 5% 추가할인',
  '🚀 로켓배송 14시간 내 도착',
  '🔥 오늘의 핫딜 시작',
  '📦 무료배송 5만원 이상',
  '⚡ 플래시세일 23:59 마감',
  '🎁 신규가입 3,000원 쿠폰',
  '💎 VIP 회원 5% 추가할인',
  '🚀 로켓배송 14시간 내 도착',
];

const AUTO_INTERVAL = 5400;

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('left');
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  }, []);

  const goTo = useCallback((i: number, dir: 'left' | 'right' = 'left') => {
    if (animating) return;
    clearTimers();
    setExitDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(i);
      setAnimating(false);
    }, 400);
  }, [animating, clearTimers]);

  useEffect(() => {
    clearTimers();
    setProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / AUTO_INTERVAL) * 100, 100));
    }, 16);
    timerRef.current = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % BANNERS.length;
        setExitDir('left');
        setAnimating(true);
        setTimeout(() => setAnimating(false), 400);
        return next;
      });
    }, AUTO_INTERVAL);
    return clearTimers;
  }, [current, clearTimers]);

  const banner = BANNERS[current];

  return (
    <div>
      {/* ── 히어로 슬라이더 ── */}
      <div
        className="relative overflow-hidden w-full select-none"
        style={{
          height: 'clamp(260px, 38vw, 520px)',
          background: banner.bg,
          transition: 'background 1.2s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
            backgroundSize: '256px 256px',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Ambient glow — left */}
        <div
          className="absolute -left-48 top-1/2 -translate-y-1/2 rounded-full pointer-events-none z-0"
          style={{
            width: 'clamp(320px, 40vw, 560px)',
            height: 'clamp(320px, 40vw, 560px)',
            background: `radial-gradient(circle, ${banner.accent} 0%, transparent 70%)`,
            opacity: 0.18,
            filter: 'blur(60px)',
            transition: 'background 1.2s ease, opacity 1.2s ease',
          }}
        />
        {/* Ambient glow — right bottom */}
        <div
          className="absolute right-0 bottom-0 rounded-full pointer-events-none z-0"
          style={{
            width: 'clamp(200px, 25vw, 360px)',
            height: 'clamp(200px, 25vw, 360px)',
            background: `radial-gradient(circle, ${banner.accent} 0%, transparent 70%)`,
            opacity: 0.07,
            filter: 'blur(40px)',
            transition: 'background 1.2s ease',
          }}
        />

        {/* Slide content */}
        <div
          className="absolute inset-0 flex z-10"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${exitDir === 'left' ? '-3%' : '3%'})`
              : 'translateX(0)',
            transition: 'opacity 0.4s cubic-bezier(0.22,1,0.36,1), transform 0.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {/* Left: text */}
          <div className="flex-1 flex flex-col justify-center px-8 md:px-14 lg:px-20 xl:px-28 pb-10 relative z-10">
            {/* Tag */}
            <div className="flex items-center gap-2.5 mb-5">
              <span
                className="h-[3px] w-8 flex-shrink-0"
                style={{ background: banner.accent }}
              />
              <span
                className="text-[11px] font-black uppercase tracking-[0.32em]"
                style={{ color: banner.accent }}
              >
                {banner.tag}
              </span>
            </div>

            {/* Title */}
            <h2
              className="font-black text-white leading-[0.95] tracking-tighter mb-4"
              style={{
                fontSize: 'clamp(2.2rem, 4.8vw, 4.8rem)',
                whiteSpace: 'pre-line',
                textShadow: '0 4px 60px rgba(0,0,0,0.5)',
              }}
            >
              {banner.title}
            </h2>

            <p className="text-white/55 font-medium mb-1" style={{ fontSize: 'clamp(0.82rem, 1.4vw, 1rem)' }}>
              {banner.sub}
            </p>
            <p className="text-white/30 mb-7" style={{ fontSize: 'clamp(0.72rem, 1.1vw, 0.85rem)' }}>
              {banner.desc}
            </p>

            {/* CTA */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => router.push(banner.href)}
                className="inline-flex items-center gap-3 font-black text-white text-[13px] group transition-all duration-200"
                style={{
                  background: banner.accent,
                  padding: 'clamp(10px,1.2vw,14px) clamp(20px,2.5vw,28px)',
                  letterSpacing: '0.02em',
                }}
              >
                {banner.cta}
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <a
                href={banner.href}
                className="text-white/40 hover:text-white/80 text-[12px] font-medium transition-colors flex items-center gap-1.5 border-b border-white/20 hover:border-white/50 pb-0.5"
              >
                전체상품 보기
              </a>
            </div>
          </div>

          {/* Right: big visual (lg+) */}
          <div className="hidden lg:flex flex-col items-center justify-center w-[38%] flex-shrink-0 relative pb-10">
            {/* Decorative rings */}
            {[0.12, 0.05, 0.025].map((opacity, ri) => (
              <div
                key={ri}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  width: `clamp(${180 + ri * 80}px, ${17 + ri * 7}vw, ${280 + ri * 130}px)`,
                  height: `clamp(${180 + ri * 80}px, ${17 + ri * 7}vw, ${280 + ri * 130}px)`,
                  border: `1px solid ${banner.accent}`,
                  opacity,
                  animation: ri === 0 ? 'float 5s ease-in-out infinite' : `float ${6 + ri}s ease-in-out infinite`,
                }}
              />
            ))}

            {/* Cross hair decorations */}
            <div
              className="absolute top-[20%] right-[15%] pointer-events-none"
              style={{ color: banner.accent, opacity: 0.2 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0v20M0 10h20" stroke="currentColor" strokeWidth="0.8"/>
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="0.8"/>
              </svg>
            </div>
            <div
              className="absolute bottom-[28%] left-[12%] pointer-events-none"
              style={{ color: banner.accent, opacity: 0.15 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 0v14M0 7h14" stroke="currentColor" strokeWidth="0.8"/>
              </svg>
            </div>

            {/* Big number */}
            <div className="text-center mb-6 relative z-10">
              <div
                className="font-black leading-none tabular-nums"
                style={{
                  fontSize: 'clamp(4.5rem, 9.5vw, 9rem)',
                  color: banner.accent,
                  textShadow: `0 0 100px ${banner.accent}44, 0 0 40px ${banner.accent}22`,
                  letterSpacing: '-0.04em',
                }}
              >
                {banner.bigText}
                {banner.bigUnit && (
                  <span style={{ fontSize: '0.4em', verticalAlign: 'super', letterSpacing: '-0.02em' }}>
                    {banner.bigUnit}
                  </span>
                )}
              </div>
              <div
                className="text-[10px] font-black uppercase tracking-[0.4em] mt-2"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                {banner.bigLabel}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-10 relative z-10">
              {[banner.stat1, banner.stat2].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-white font-black text-xl tabular-nums leading-tight">{stat.value}</div>
                  <div className="text-white/25 text-[11px] mt-1 tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center px-8 md:px-14 lg:px-20 xl:px-28 pb-4 gap-4 z-20">
          <div className="flex items-center gap-2 flex-1">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? 'left' : 'right')}
                className="transition-all duration-300 flex-shrink-0"
                style={{
                  width: i === current ? '28px' : '5px',
                  height: '3px',
                  background: i === current ? banner.accent : 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                }}
                aria-label={`슬라이드 ${i + 1}`}
              />
            ))}
            <span className="text-white/20 text-[10px] font-mono ml-1 tabular-nums">
              {String(current + 1).padStart(2, '0')}/{String(BANNERS.length).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { dir: 'right' as const, path: 'M15 19l-7-7 7-7', label: '이전', next: (current - 1 + BANNERS.length) % BANNERS.length },
              { dir: 'left' as const, path: 'M9 5l7 7-7 7', label: '다음', next: (current + 1) % BANNERS.length },
            ].map(({ dir, path, label, next }) => (
              <button
                key={label}
                onClick={() => goTo(next, dir)}
                className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                aria-label={label}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={path} />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.05] z-20">
          <div
            className="h-full"
            style={{ width: `${progress}%`, background: banner.accent, transition: 'none' }}
          />
        </div>
      </div>

      {/* ── 마키 티커 바 ── */}
      <div
        className="bg-gray-950 overflow-hidden"
        style={{ height: '34px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div
          className="flex items-center h-full gap-0 whitespace-nowrap"
          style={{ animation: 'marquee 30s linear infinite' }}
        >
          {TICKER_ITEMS.map((item, i) => (
            <span key={i} className="flex items-center gap-0 text-[11px] font-medium text-gray-500 px-0">
              <span className="px-5">{item}</span>
              <span className="text-gray-800 px-1" aria-hidden>·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
