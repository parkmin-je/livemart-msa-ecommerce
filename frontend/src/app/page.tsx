'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { GlobalNav } from '@/components/GlobalNav';
import { ProductCard } from '@/components/ProductCard';
import { CartSummary } from '@/components/CartSummary';
import { productApi } from '@/api/productApi';

// ── 히어로 배너 데이터 ──────────────────────────────────
const BANNERS = [
  {
    id: 1,
    title: '봄 맞이 특가',
    subtitle: '인기 상품 최대 30% 할인',
    cta: '지금 쇼핑하기',
    href: '/products',
    bg: 'from-red-600 to-rose-500',
    emoji: '🌸',
  },
  {
    id: 2,
    title: '로켓배송 특집',
    subtitle: '5만원 이상 주문 시 무료배송',
    cta: '로켓배송 상품 보기',
    href: '/search?q=로켓',
    bg: 'from-blue-600 to-indigo-600',
    emoji: '🚀',
  },
  {
    id: 3,
    title: '신상품 입고',
    subtitle: '전자기기 · 패션 · 뷰티 최신 상품',
    cta: '신상품 보기',
    href: '/products',
    bg: 'from-purple-600 to-violet-600',
    emoji: '✨',
  },
];

const CATEGORIES = [
  { label: '전자기기', emoji: '📱', href: '/search?cat=1', bg: 'bg-blue-50', text: 'text-blue-700' },
  { label: '패션', emoji: '👗', href: '/search?cat=2', bg: 'bg-pink-50', text: 'text-pink-700' },
  { label: '식품', emoji: '🍎', href: '/search?cat=3', bg: 'bg-green-50', text: 'text-green-700' },
  { label: '홈/리빙', emoji: '🏠', href: '/search?cat=4', bg: 'bg-amber-50', text: 'text-amber-700' },
  { label: '뷰티', emoji: '💄', href: '/search?cat=5', bg: 'bg-rose-50', text: 'text-rose-700' },
  { label: '스포츠', emoji: '⚽', href: '/search?cat=6', bg: 'bg-orange-50', text: 'text-orange-700' },
];

// ── 히어로 배너 컴포넌트 ───────────────────────────────
function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % BANNERS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[current];

  return (
    <div className={`relative bg-gradient-to-r ${banner.bg} rounded-2xl overflow-hidden h-52 md:h-64 transition-all duration-500`}>
      <div className="absolute inset-0 flex items-center">
        <div className="px-8 md:px-12 max-w-lg">
          <div className="text-5xl md:text-7xl mb-4 animate-fadeInUp">{banner.emoji}</div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2 animate-fadeInUp">{banner.title}</h2>
          <p className="text-white/80 text-sm md:text-base mb-5 animate-fadeInUp">{banner.subtitle}</p>
          <button
            onClick={() => router.push(banner.href)}
            className="bg-white text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors shadow-lg"
          >
            {banner.cta} →
          </button>
        </div>
      </div>

      {/* 배너 인디케이터 */}
      <div className="absolute bottom-4 right-6 flex gap-2">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all rounded-full ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/75'}`}
          />
        ))}
      </div>

      {/* 좌우 화살표 */}
      <button
        onClick={() => setCurrent(c => (c - 1 + BANNERS.length) % BANNERS.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors"
      >
        ‹
      </button>
      <button
        onClick={() => setCurrent(c => (c + 1) % BANNERS.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ── 섹션 헤더 ─────────────────────────────────────────
function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {href && (
        <a href={href} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
          전체보기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </div>
  );
}

// ── 상품 스켈레톤 ─────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mt-3" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-9 bg-gray-200 rounded mt-2" />
      </div>
    </div>
  );
}

// ── 메인 홈 페이지 ────────────────────────────────────
export default function Home() {
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => productApi.getProducts({ page: 0, size: 20 }),
    staleTime: 60000,
  });

  const products = allProducts?.content || [];

  // 카테고리별로 분류
  const electronics = products.filter((p: any) => p.categoryId === 1).slice(0, 4);
  const fashion = products.filter((p: any) => p.categoryId === 2).slice(0, 4);
  const featured = products.slice(0, 8);
  const newArrivals = [...products].reverse().slice(0, 8);

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />

      <div className="max-w-[1280px] mx-auto px-4 py-5 space-y-8">

        {/* ── 히어로 배너 ── */}
        <HeroBanner />

        {/* ── 이벤트 바 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🚀', title: '로켓배송', desc: '오늘 주문 → 내일 도착', color: 'bg-blue-50 border-blue-100' },
            { icon: '🎁', title: '5만원 이상 무료배송', desc: '전 품목 배송비 혜택', color: 'bg-green-50 border-green-100' },
            { icon: '🔒', title: '안전결제', desc: '카드 · 계좌이체 · 간편결제', color: 'bg-purple-50 border-purple-100' },
          ].map((item) => (
            <div key={item.title} className={`${item.color} border rounded-xl p-4 flex items-center gap-3`}>
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 카테고리 쇼케이스 ── */}
        <section className="bg-white rounded-2xl p-6">
          <SectionHeader title="카테고리" subtitle="원하는 상품을 빠르게 찾아보세요" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.label}
                href={cat.href}
                className={`${cat.bg} rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
                <span className={`text-xs font-semibold ${cat.text}`}>{cat.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── 추천 상품 ── */}
        <section className="bg-white rounded-2xl p-6">
          <SectionHeader title="🔥 오늘의 추천" subtitle="가장 인기 있는 상품을 만나보세요" href="/products" />
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">📦</div>
              <p>상품을 불러오는 중...</p>
            </div>
          )}
        </section>

        {/* ── 전자기기 & 패션 병렬 섹션 ── */}
        {(electronics.length > 0 || fashion.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 전자기기 */}
            {electronics.length > 0 && (
              <section className="bg-white rounded-2xl p-6">
                <SectionHeader title="📱 전자기기" href="/search?cat=1" />
                <div className="grid grid-cols-2 gap-3">
                  {electronics.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
            {/* 패션 */}
            {fashion.length > 0 && (
              <section className="bg-white rounded-2xl p-6">
                <SectionHeader title="👗 패션" href="/search?cat=2" />
                <div className="grid grid-cols-2 gap-3">
                  {fashion.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── 신상품 ── */}
        {newArrivals.length > 0 && (
          <section className="bg-white rounded-2xl p-6">
            <SectionHeader title="✨ 신상품" subtitle="방금 입고된 새로운 상품들" href="/products" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {newArrivals.map((product: any) => (
                <ProductCard key={`new-${product.id}`} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* ── 하단 배너 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/auth" className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 text-white hover:opacity-90 transition-opacity flex items-center gap-4">
            <span className="text-4xl">🎉</span>
            <div>
              <div className="font-bold text-lg">신규 회원 혜택</div>
              <div className="text-sm text-gray-300 mt-1">가입 즉시 3,000원 쿠폰 지급</div>
            </div>
          </a>
          <a href="/seller" className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-6 text-white hover:opacity-90 transition-opacity flex items-center gap-4">
            <span className="text-4xl">🏪</span>
            <div>
              <div className="font-bold text-lg">판매자 시작하기</div>
              <div className="text-sm text-white/80 mt-1">지금 바로 판매를 시작해보세요</div>
            </div>
          </a>
        </div>
      </div>

      {/* 플로팅 장바구니 */}
      <CartSummary />

      {/* ── 푸터 ── */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-[1280px] mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-xl font-black mb-3">
                <span className="text-red-500">Live</span>Mart
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                MSA 기반 엔터프라이즈<br />이커머스 플랫폼
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-200">쇼핑</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/products" className="hover:text-white transition">전체 상품</a></li>
                <li><a href="/search" className="hover:text-white transition">검색</a></li>
                <li><a href="/cart" className="hover:text-white transition">장바구니</a></li>
                <li><a href="/wishlist" className="hover:text-white transition">위시리스트</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-200">고객센터</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/my-orders" className="hover:text-white transition">주문 내역</a></li>
                <li><a href="/returns" className="hover:text-white transition">반품/환불</a></li>
                <li><a href="/notifications" className="hover:text-white transition">알림</a></li>
                <li><a href="/profile" className="hover:text-white transition">내 정보</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-200">비즈니스</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/seller" className="hover:text-white transition">판매자센터</a></li>
                <li><a href="/admin" className="hover:text-white transition">관리자</a></li>
                <li><a href="/seller/products" className="hover:text-white transition">상품 등록</a></li>
                <li><a href="/admin/coupons" className="hover:text-white transition">쿠폰 관리</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">© 2026 LiveMart. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Spring Boot 3.4 · Next.js 15 · Kubernetes</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
