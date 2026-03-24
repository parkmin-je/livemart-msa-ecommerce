'use client';

import { useState, useEffect, useRef } from 'react';

// 이미지 오류 처리를 위한 개별 컴포넌트
function FlashProductImage({ imageUrl, name, hovered }: { imageUrl?: string; name: string; hovered: boolean }) {
  const [err, setErr] = useState(false);
  return imageUrl && !err ? (
    <img
      src={imageUrl}
      alt={name}
      className="w-full h-full object-cover"
      style={{
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
      }}
      loading="lazy"
      onError={() => setErr(true)}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center">
      <svg className="w-8 h-8" style={{ color: '#333' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId?: number;
}

const FLASH_DISCOUNTS = [20, 30, 25, 35, 40, 45, 50, 28];

/* Bebas Neue countdown block */
function TimeBlock({ value, label }: { value: number; label: string }) {
  const prev = useRef(value);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      setFlip(true);
      setTimeout(() => setFlip(false), 300);
      prev.current = value;
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative overflow-hidden"
        style={{
          width: 'clamp(36px, 4.5vw, 52px)',
          height: 'clamp(36px, 4.5vw, 52px)',
          background: '#E8001D',
        }}
      >
        <span
          className="font-bebas text-white absolute inset-0 flex items-center justify-center tabular-nums"
          style={{
            fontSize: 'clamp(1.3rem, 2.4vw, 1.9rem)',
            letterSpacing: '0.02em',
            transform: flip ? 'translateY(-100%)' : 'translateY(0)',
            transition: flip ? 'none' : 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

export function FlashSaleSection({ products }: { products: Product[] }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

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
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const flashProducts = products.slice(0, 8).map((p, i) => ({
    ...p,
    discount: FLASH_DISCOUNTS[i % FLASH_DISCOUNTS.length],
  }));

  if (flashProducts.length === 0) return null;

  return (
    <section style={{ background: '#0A0A0A', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 md:px-7 py-4 flex-wrap gap-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Left: title */}
        <div className="flex items-center gap-4">
          {/* Lightning bolt */}
          <div
            className="w-9 h-9 flex items-center justify-center flex-shrink-0"
            style={{ background: '#E8001D' }}
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="font-bebas text-white tracking-wider"
                style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)', letterSpacing: '0.08em' }}
              >
                FLASH SALE
              </span>
              {/* LIVE badge */}
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                style={{ background: 'rgba(232,0,29,0.15)', border: '1px solid rgba(232,0,29,0.3)', color: '#E8001D' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-soft" />
                LIVE
              </span>
            </div>
            <p className="text-white/25 text-[11px] tracking-wide">번개특가 · 한정 수량 · 오늘만</p>
          </div>
        </div>

        {/* Right: countdown */}
        <div className="flex items-center gap-2.5">
          <span className="text-white/20 text-[10px] uppercase tracking-widest mr-1 hidden sm:block">종료까지</span>
          <TimeBlock value={timeLeft.h} label="시간" />
          <span className="font-bebas text-white/20 text-2xl mb-3">:</span>
          <TimeBlock value={timeLeft.m} label="분" />
          <span className="font-bebas text-white/20 text-2xl mb-3">:</span>
          <TimeBlock value={timeLeft.s} label="초" />
        </div>
      </div>

      {/* ── Product scroll rail ── */}
      <div className="px-4 md:px-6 py-5 overflow-x-auto no-scrollbar">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {flashProducts.map((p, i) => {
            const originalPrice = Math.round(p.price / (1 - p.discount / 100) / 100) * 100;
            const isHot = p.discount >= 40;

            return (
              <a
                key={p.id}
                href={`/products/${p.id}`}
                className="flex-none group"
                style={{ width: 'clamp(130px, 14vw, 156px)' }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                {/* Image */}
                <div
                  className="relative mb-2.5 overflow-hidden"
                  style={{
                    aspectRatio: '1',
                    background: '#1A1A1A',
                    outline: activeIdx === i ? '1px solid #E8001D' : '1px solid transparent',
                    transition: 'outline 0.2s ease',
                  }}
                >
                  <FlashProductImage imageUrl={p.imageUrl} name={p.name} hovered={activeIdx === i} />

                  {/* Discount badge — Bebas Neue */}
                  <div
                    className="absolute top-0 left-0 flex items-center justify-center"
                    style={{
                      background: isHot ? '#FF8C00' : '#E8001D',
                      minWidth: '38px',
                      height: '28px',
                      padding: '0 6px',
                    }}
                  >
                    <span
                      className="font-bebas text-white"
                      style={{ fontSize: '1rem', letterSpacing: '0.02em', lineHeight: 1 }}
                    >
                      -{p.discount}%
                    </span>
                  </div>

                  {/* HOT indicator */}
                  {isHot && (
                    <div
                      className="absolute top-0 right-0 px-1.5 py-0.5"
                      style={{ background: '#FF8C00' }}
                    >
                      <span className="text-[9px] font-black text-white tracking-wider">HOT</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <p
                    className="text-white/70 line-clamp-2 mb-2 leading-snug transition-colors duration-200"
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: activeIdx === i ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {p.name}
                  </p>
                  <p className="text-white/25 line-through tabular-nums" style={{ fontSize: '10px' }}>
                    {originalPrice.toLocaleString()}원
                  </p>
                  <div className="flex items-baseline gap-0.5">
                    <span
                      className="font-bebas text-white tabular-nums"
                      style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', letterSpacing: '0.01em' }}
                    >
                      {p.price.toLocaleString()}
                    </span>
                    <span className="text-white/40 text-[10px]">원</span>
                  </div>
                </div>
              </a>
            );
          })}

          {/* View all CTA */}
          <a
            href="/products"
            className="flex-none flex flex-col items-center justify-center gap-3 transition-colors"
            style={{
              width: 'clamp(100px, 10vw, 120px)',
              aspectRatio: '1',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.3)',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#E8001D';
              e.currentTarget.style.color = '#E8001D';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7"/>
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
              전체<br/>보기
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
