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
    sub: '베스트셀러 오늘만 특가 · 한정 수량',
    cta: '지금 쇼핑하기',
    ctaSub: '전체 상품 보기',
    href: '/products',
    bg: '#080808',
    bgGrad: 'radial-gradient(ellipse 80% 60% at 20% 50%, #2A0000 0%, #080808 65%)',
    accent: '#E8001D',
    accentDim: 'rgba(232,0,29,0.12)',
    pill: { text: '12,847명 참여 중', dot: true },
    stat1: { v: '30%', l: '최대 할인' },
    stat2: { v: '한정', l: '남은 수량' },
    stat3: { v: '오늘만', l: '특가 기간' },
  },
  {
    id: 2,
    eyebrow: 'ROCKET DELIVERY',
    titleKo: '오늘 주문',
    titleNum: '14',
    titleUnit: 'H',
    titleSuffix: '내 도착',
    sub: '5만원 이상 전품목 무료배송 · 99.1% 만족도',
    cta: '전체상품 보기',
    ctaSub: '배송 정책 확인',
    href: '/products',
    bg: '#010A14',
    bgGrad: 'radial-gradient(ellipse 80% 60% at 20% 50%, #00142A 0%, #010A14 65%)',
    accent: '#0EA5E9',
    accentDim: 'rgba(14,165,233,0.10)',
    pill: { text: '평균 14시간 내 도착', dot: true },
    stat1: { v: '99.1%', l: '고객 만족도' },
    stat2: { v: '14H', l: '평균 도착' },
    stat3: { v: '무료', l: '5만원 이상' },
  },
  {
    id: 3,
    eyebrow: '2026 S/S COLLECTION',
    titleKo: '봄 신상',
    titleNum: '247',
    titleUnit: '',
    titleSuffix: '종 입고',
    sub: '트렌디한 봄 시즌 신상품 총출동 · 매일 업데이트',
    cta: '신상품 보기',
    ctaSub: '카테고리 전체보기',
    href: '/products',
    bg: '#020B05',
    bgGrad: 'radial-gradient(ellipse 80% 60% at 20% 50%, #002010 0%, #020B05 65%)',
    accent: '#22C55E',
    accentDim: 'rgba(34,197,94,0.10)',
    pill: { text: '오늘 32종 신규 입고', dot: true },
    stat1: { v: '247', l: '신상품 종류' },
    stat2: { v: '매일', l: '업데이트' },
    stat3: { v: '무료', l: '반품 정책' },
  },
];

const TICKER = [
  '🔥 플래시세일 진행 중',
  '📦 5만원 이상 무료배송',
  '⚡ 오늘 오후 2시 주문 → 내일 도착',
  '🎁 신규가입 3,000원 즉시 지급',
  '💳 카드결제 5% 추가할인',
  '🚀 로켓배송 14시간 내 도착',
  '⭐ VIP 회원 전용 비밀특가',
  '🔥 플래시세일 진행 중',
  '📦 5만원 이상 무료배송',
  '⚡ 오늘 오후 2시 주문 → 내일 도착',
  '🎁 신규가입 3,000원 즉시 지급',
  '💳 카드결제 5% 추가할인',
  '🚀 로켓배송 14시간 내 도착',
  '⭐ VIP 회원 전용 비밀특가',
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

          {/* RIGHT: Stats panel (desktop) */}
          <div className="hidden lg:flex flex-col items-center justify-center pr-16 xl:pr-24 flex-shrink-0 w-[320px] xl:w-[380px] relative z-10 gap-8">

            {/* Decorative rings */}
            {[0, 1, 2].map((ri) => (
              <div
                key={ri}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  width: `${200 + ri * 90}px`,
                  height: `${200 + ri * 90}px`,
                  border: `1px solid ${b.accent}`,
                  opacity: [0.14, 0.07, 0.03][ri],
                  animation: `float ${5 + ri}s ease-in-out infinite`,
                  animationDelay: `${ri * 0.8}s`,
                }}
              />
            ))}

            {/* Crosshair top-right */}
            <svg
              className="absolute top-[22%] right-[18%]"
              width="22" height="22" viewBox="0 0 22 22" fill="none"
              style={{ opacity: 0.2 }}
            >
              <path d="M11 0v22M0 11h22" stroke={b.accent} strokeWidth="0.8" />
              <circle cx="11" cy="11" r="4" stroke={b.accent} strokeWidth="0.8" />
            </svg>

            {/* Stats */}
            <div className="relative z-10 flex flex-col gap-6">
              {[b.stat1, b.stat2, b.stat3].map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <span
                    className="font-bebas leading-none mb-1"
                    style={{
                      fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)',
                      color: i === 0 ? b.accent : 'rgba(255,255,255,0.85)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {s.v}
                  </span>
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
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
