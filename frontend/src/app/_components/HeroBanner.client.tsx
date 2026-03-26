'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BANNERS = [
  {
    id: 1,
    eyebrow: 'FLASH SALE',
    titleKo: '최대',
    titleNum: '30',
    titleUnit: '%',
    titleSuffix: '할인',
    sub: '다양한 카테고리 할인 상품을 한 곳에서 — 오늘의 특가를 놓치지 마세요',
    cta: '지금 쇼핑하기',
    ctaSub: '전체 상품 보기',
    href: '/products',
    bg: '#080808',
    bgGrad: 'radial-gradient(ellipse 80% 60% at 20% 50%, #2A0000 0%, #080808 65%)',
    accent: '#E8001D',
    accentDim: 'rgba(232,0,29,0.12)',
    pill: { text: 'SALE', dot: true },
  },
  {
    id: 2,
    eyebrow: 'FREE SHIPPING',
    titleKo: '오늘도',
    titleNum: 'FREE',
    titleUnit: '',
    titleSuffix: '배송',
    sub: '5만원 이상 주문 시 무료배송 · 실시간 배송 조회 지원',
    cta: '상품 둘러보기',
    ctaSub: '배송 안내',
    href: '/products',
    bg: '#010A14',
    bgGrad: 'radial-gradient(ellipse 80% 60% at 20% 50%, #00142A 0%, #010A14 65%)',
    accent: '#0EA5E9',
    accentDim: 'rgba(14,165,233,0.10)',
    pill: { text: '5만원 이상 무료', dot: false },
  },
  {
    id: 3,
    eyebrow: '2026 S/S COLLECTION',
    titleKo: '봄 시즌',
    titleNum: 'NEW',
    titleUnit: '',
    titleSuffix: '컬렉션',
    sub: '매일 업데이트되는 신상품 — 트렌디한 봄 아이템을 먼저 만나보세요',
    cta: '신상품 보기',
    ctaSub: '카테고리 전체보기',
    href: '/products',
    bg: '#020B05',
    bgGrad: 'radial-gradient(ellipse 80% 60% at 20% 50%, #002010 0%, #020B05 65%)',
    accent: '#22C55E',
    accentDim: 'rgba(34,197,94,0.10)',
    pill: { text: 'NEW IN', dot: false },
  },
];

const TICKER = [
  'FLASH SALE — 할인 상품 모아보기',
  '5만원 이상 구매 시 무료배송',
  '신규가입 즉시 쿠폰 지급',
  '안전결제 — Stripe 연동',
  '신상품 매일 업데이트',
  'FLASH SALE — 할인 상품 모아보기',
  '5만원 이상 구매 시 무료배송',
  '신규가입 즉시 쿠폰 지급',
  '안전결제 — Stripe 연동',
  '신상품 매일 업데이트',
];

const INTERVAL = 5600;

export function HeroBanner() {
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const clear = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  }, []);

  const goTo = useCallback((i: number) => {
    clear();
    setLeaving(true);
    setTimeout(() => { setIdx(i); setLeaving(false); }, 480);
  }, [clear]);

  useEffect(() => {
    clear();
    setProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / INTERVAL) * 100, 100));
    }, 16);
    timerRef.current = setInterval(() => {
      setIdx(prev => {
        const next = (prev + 1) % BANNERS.length;
        setLeaving(true);
        setTimeout(() => { setIdx(next); setLeaving(false); }, 480);
        return prev;
      });
    }, INTERVAL);
    return clear;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const b = BANNERS[idx];

  return (
    <div>
      {/* ══════════════════════════════════════
          HERO — cinematic, editorial
          ══════════════════════════════════════ */}
      <div
        className="relative overflow-hidden w-full select-none"
        style={{ height: 'clamp(320px, 55vw, 660px)', background: b.bg }}
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: b.bgGrad,
            transition: 'background 1.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        />

        {/* Noise texture */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
            backgroundSize: '256px 256px',
          }}
        />

        {/* Fine grid */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow orb left */}
        <div
          className="absolute z-0 pointer-events-none"
          style={{
            left: '-10%', top: '50%', transform: 'translateY(-50%)',
            width: 'clamp(300px, 45vw, 600px)',
            height: 'clamp(300px, 45vw, 600px)',
            background: `radial-gradient(circle, ${b.accent} 0%, transparent 70%)`,
            opacity: 0.14,
            filter: 'blur(80px)',
            transition: 'background 1.4s ease',
          }}
        />

        {/* Diagonal separator line */}
        <div
          className="absolute inset-0 z-0 pointer-events-none hidden lg:block"
          style={{
            background: `linear-gradient(105deg, transparent 55%, ${b.accentDim} 55%, ${b.accentDim} 56%, transparent 56%)`,
          }}
        />

        {/* ── SLIDE CONTENT ── */}
        <div
          className="absolute inset-0 z-10 flex"
          style={{
            opacity: leaving ? 0 : 1,
            transform: leaving ? 'translateX(-2%) scale(0.99)' : 'translateX(0) scale(1)',
            transition: 'opacity 0.48s cubic-bezier(0.22,1,0.36,1), transform 0.48s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {/* LEFT: Primary content */}
          <div className="flex-1 flex flex-col justify-center pl-8 md:pl-14 lg:pl-20 xl:pl-28 pr-4 pb-14 relative z-10 max-w-[700px]">

            {/* Live pill indicator */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                {b.pill.dot && (
                  <span className="relative flex items-center justify-center w-2 h-2">
                    <span className="relative z-10 w-2 h-2 rounded-full" style={{ background: b.accent }} />
                    <span className="absolute inset-0 w-2 h-2 rounded-full" style={{ background: b.accent, animation: 'liveRing 1.6s ease-out infinite' }} />
                  </span>
                )}
                <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase">{b.pill.text}</span>
              </div>
            </div>

            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: '28px', height: '2px', background: b.accent, flexShrink: 0 }} />
              <span
                className="text-[10px] font-black tracking-[0.35em] uppercase"
                style={{ color: b.accent }}
              >
                {b.eyebrow}
              </span>
            </div>

            {/* Main headline — EDITORIAL LAYOUT */}
            <div className="mb-5">
              {/* Korean title line */}
              <div
                className="text-white font-black leading-none mb-1"
                style={{ fontSize: 'clamp(1.4rem, 3.2vw, 2.8rem)', letterSpacing: '-0.04em' }}
              >
                {b.titleKo}
              </div>

              {/* Big number with Bebas Neue */}
              <div className="flex items-baseline gap-2 leading-none">
                <span
                  className="font-bebas text-white"
                  style={{
                    fontSize: 'clamp(5rem, 13vw, 11rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: '0.88',
                    color: b.accent,
                    textShadow: `0 0 80px ${b.accent}40, 0 0 160px ${b.accent}20`,
                  }}
                >
                  {b.titleNum}
                </span>
                {b.titleUnit && (
                  <span
                    className="font-bebas text-white"
                    style={{
                      fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
                      lineHeight: '0.88',
                      color: `${b.accent}CC`,
                    }}
                  >
                    {b.titleUnit}
                  </span>
                )}
                <span
                  className="text-white font-black self-end pb-1 hidden sm:block"
                  style={{ fontSize: 'clamp(1.2rem, 2.8vw, 2.4rem)', letterSpacing: '-0.04em', opacity: 0.7 }}
                >
                  {b.titleSuffix}
                </span>
              </div>
            </div>

            <p
              className="text-white/45 mb-7"
              style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)', letterSpacing: '-0.01em', lineHeight: 1.6 }}
            >
              {b.sub}
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => router.push(b.href)}
                className="group flex items-center gap-3 font-black text-white transition-all duration-200"
                style={{
                  background: b.accent,
                  padding: 'clamp(10px,1.1vw,15px) clamp(20px,2.2vw,28px)',
                  fontSize: 'clamp(0.75rem, 1.1vw, 0.9rem)',
                  letterSpacing: '0.02em',
                  boxShadow: `0 4px 24px ${b.accent}40`,
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {b.cta}
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <a
                href={b.href}
                className="text-white/30 hover:text-white/70 transition-colors text-xs font-medium flex items-center gap-1.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2px' }}
              >
                {b.ctaSub}
              </a>
            </div>
          </div>

          {/* RIGHT: Editorial mark (desktop) */}
          <div className="hidden lg:flex items-center justify-center pr-16 xl:pr-24 flex-shrink-0 w-[280px] xl:w-[320px] relative z-10 pointer-events-none select-none">
            <span
              className="font-bebas leading-none"
              style={{
                fontSize: 'clamp(7rem, 16vw, 13rem)',
                letterSpacing: '0.04em',
                color: 'transparent',
                WebkitTextStroke: `1px ${b.accent}`,
                opacity: 0.1,
              }}
            >
              LM
            </span>
          </div>
        </div>

        {/* ── BOTTOM CONTROLS ── */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center px-8 md:px-14 lg:px-20 xl:px-28 pb-4 gap-5 z-20">
          {/* Dot indicators */}
          <div className="flex items-center gap-2.5 flex-1">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`슬라이드 ${i + 1}`}
                style={{
                  width: i === idx ? '32px' : '6px',
                  height: '3px',
                  background: i === idx ? b.accent : 'rgba(255,255,255,0.18)',
                  borderRadius: '2px',
                  transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                  flexShrink: 0,
                }}
              />
            ))}
            <span className="text-white/20 text-[10px] font-mono ml-1 tabular-nums tracking-wider">
              {String(idx + 1).padStart(2, '0')}/{String(BANNERS.length).padStart(2, '0')}
            </span>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            {[
              { label: '이전', next: (idx - 1 + BANNERS.length) % BANNERS.length, d: 'M15 19l-7-7 7-7' },
              { label: '다음', next: (idx + 1) % BANNERS.length, d: 'M9 5l7 7-7 7' },
            ].map(({ label, next, d }) => (
              <button
                key={label}
                onClick={() => goTo(next)}
                aria-label={label}
                className="w-8 h-8 flex items-center justify-center transition-all duration-200"
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.3)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={d} />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Progress line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="h-full transition-none"
            style={{ width: `${progress}%`, background: b.accent }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════
          TICKER BAR
          ══════════════════════════════════════ */}
      <div
        style={{
          background: '#0A0A0A',
          height: '36px',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="flex items-center h-full whitespace-nowrap"
          style={{ animation: 'marquee 32s linear infinite' }}
        >
          {TICKER.map((item, i) => (
            <span key={i} className="flex items-center shrink-0">
              <span className="text-[11px] font-medium text-white/30 px-5">{item}</span>
              <span className="text-white/10 text-xs" aria-hidden>│</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
