/**
 * 홈 페이지 — Next.js 15 Server Component
 * PC-first redesign: full-width hero, white bg, xl 5-col product grid
 */

import { GlobalNav } from '@/components/GlobalNav';
import { ProductCard } from '@/components/ProductCard';
import { CartSummary } from '@/components/CartSummary';
import { HeroBanner } from './_components/HeroBanner.client';
import { FlashSaleSection } from './_components/FlashSaleSection.client';
import { WelcomeCouponBanner } from './_components/WelcomeCouponBanner.client';
import { RecentlyViewedSection } from './_components/RecentlyViewedSection.client';
import { AiRecommendations } from './_components/AiRecommendations.client';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  stockQuantity?: number;
  categoryId?: number;
  description?: string;
}

const CATEGORIES = [
  {
    label: '전자기기', href: '/products?cat=1', bg: '#EFF6FF', color: '#2563EB',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  },
  {
    label: '패션', href: '/products?cat=2', bg: '#FFF1F2', color: '#F43F5E',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 2l1.5 4.5S6 8 6 10v10h12V10c0-2-1.5-3.5-1.5-3.5L18 2c-1.5 1-3 1.5-6 1.5S7.5 3 6 2z"/></svg>,
  },
  {
    label: '식품', href: '/products?cat=3', bg: '#F0FDF4', color: '#16A34A',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  },
  {
    label: '홈/리빙', href: '/products?cat=4', bg: '#FFFBEB', color: '#D97706',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  },
  {
    label: '뷰티', href: '/products?cat=5', bg: '#FDF2F8', color: '#DB2777',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3c-4.5 0-7 3-7 6 0 2.5 1.5 4.5 3.5 5.5V18a1 1 0 001 1h5a1 1 0 001-1v-3.5C17.5 13.5 19 11.5 19 9c0-3-2.5-6-7-6z M9 21h6"/></svg>,
  },
  {
    label: '스포츠', href: '/products?cat=6', bg: '#FFF7ED', color: '#EA580C',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  },
];

async function fetchProducts(): Promise<Product[]> {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  try {
    const res = await fetch(`${apiUrl}/api/products?page=0&size=20`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.content ?? data ?? [];
  } catch {
    return [];
  }
}

function SectionHeader({
  title,
  subtitle,
  href,
  accent = true,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-5 md:mb-6">
      <div className="flex items-center gap-3">
        {accent && <div className="w-1 h-5 bg-red-600 rounded-full flex-shrink-0" />}
        <div>
          <h2 className="text-[17px] md:text-[19px] font-bold text-gray-900 leading-snug">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5 font-normal">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <a
          href={href}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 pb-0.5 flex-shrink-0"
        >
          전체보기
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </div>
  );
}

export default async function Home() {
  const products = await fetchProducts();

  const electronics = products.filter(p => p.categoryId === 1).slice(0, 5);
  const fashion = products.filter(p => p.categoryId === 2).slice(0, 5);
  const featured = products.slice(0, 10);
  const newArrivals = [...products].reverse().slice(0, 10);

  return (
    <main className="min-h-screen bg-white pb-14 md:pb-0">
      <GlobalNav />

      {/* Promo strip — full-width, compact */}
      <div className="bg-gray-950">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <p className="text-xs text-gray-400">
              신규가입 즉시{' '}
              <span className="text-white font-medium">3,000원 쿠폰</span> 지급 ·{' '}
              카드결제{' '}
              <span className="text-white font-medium">5% 추가할인</span>
            </p>
            <a
              href="/auth"
              className="flex-shrink-0 ml-4 text-red-400 hover:text-red-300 font-semibold text-xs transition-colors flex items-center gap-0.5 whitespace-nowrap"
            >
              지금 가입
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Hero — full viewport width */}
      <HeroBanner />

      {/* Main content */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 xl:px-12 py-8 space-y-10">

        {/* Benefit strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100 border border-gray-100">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              ),
              title: '로켓배송',
              desc: '오늘 주문 · 내일 도착 보장',
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              ),
              title: '5만원 이상 무료',
              desc: '전 품목 배송비 혜택',
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: '안전결제',
              desc: '카드 · 계좌이체 · 간편결제',
              color: 'text-violet-600',
              bg: 'bg-violet-50',
            },
          ].map(item => (
            <div key={item.title} className="bg-white px-5 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm leading-tight">{item.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Flash sale */}
        <FlashSaleSection products={products} />

        {/* Categories */}
        <section>
          <SectionHeader title="카테고리" subtitle="원하는 상품을 빠르게" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4">
            {CATEGORIES.map(cat => (
              <a key={cat.label} href={cat.href}
                className="flex flex-col items-center gap-2.5 group py-1">
                <div
                  className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 group-hover:shadow-md"
                  style={{ background: cat.bg, color: cat.color }}
                >
                  {cat.icon}
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-red-600 transition-colors text-center leading-tight">
                  {cat.label}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* AI Recommendations */}
        <AiRecommendations />

        {/* MD PICK editorial block */}
        <section className="border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
            <span className="text-[11px] font-black bg-gray-900 text-white px-2.5 py-1 tracking-wider">
              MD PICK
            </span>
            <h2 className="text-base font-bold text-gray-900">에디터 추천</h2>
            <span className="text-xs text-gray-400 hidden sm:block">전문 MD가 엄선한 이달의 상품</span>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              {
                title: '2026 신형 스마트폰 특가',
                desc: '최신 플래그십 모델 역대급 할인',
                badge: '-25%',
                badgeColor: '#DC2626',
                badgeBg: '#FEF2F2',
                href: '/products?cat=1',
                num: '01',
              },
              {
                title: '봄 시즌 신상 패션',
                desc: '트렌디한 봄 패션 아이템 총집합',
                badge: 'NEW',
                badgeColor: '#059669',
                badgeBg: '#ECFDF5',
                href: '/products?cat=2',
                num: '02',
              },
              {
                title: '홈 인테리어 위크',
                desc: '집을 더 예쁘게, 최대 40% 세일',
                badge: '~40%',
                badgeColor: '#B45309',
                badgeBg: '#FFFBEB',
                href: '/products?cat=4',
                num: '03',
              },
            ].map((item) => (
              <a key={item.title} href={item.href}
                className="flex items-center gap-5 px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                <span className="text-[26px] font-black text-gray-100 tabular-nums leading-none flex-shrink-0 w-10">
                  {item.num}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-sm"
                      style={{ color: item.badgeColor, background: item.badgeBg }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <svg className="w-4 h-4 text-gray-200 group-hover:text-red-400 flex-shrink-0 transition-colors"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </section>

        {/* Featured products */}
        <section>
          <SectionHeader title="오늘의 추천" subtitle="가장 인기 있는 상품을 만나보세요" href="/products" />
          {featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 xl:gap-5">
              {featured.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-300">
              <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-sm">등록된 상품이 없습니다</p>
            </div>
          )}
        </section>

        {/* 전자기기 & 패션 — side-by-side on lg+ */}
        {(electronics.length > 0 || fashion.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            {electronics.length > 0 && (
              <section>
                <SectionHeader title="전자기기" href="/products?cat=1" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {electronics.map(product => <ProductCard key={product.id} product={product} />)}
                </div>
              </section>
            )}
            {fashion.length > 0 && (
              <section>
                <SectionHeader title="패션" href="/products?cat=2" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {fashion.map(product => <ProductCard key={product.id} product={product} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* New arrivals */}
        {newArrivals.length > 0 && (
          <section>
            <SectionHeader title="신상품" subtitle="방금 입고된 새로운 상품들" href="/products" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 xl:gap-5">
              {newArrivals.map(product => <ProductCard key={`new-${product.id}`} product={product} />)}
            </div>
          </section>
        )}

        {/* Recently viewed */}
        <RecentlyViewedSection />

        {/* Bottom banners */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WelcomeCouponBanner />
          <a
            href="/seller"
            className="group bg-gray-950 px-7 py-6 text-white hover:bg-gray-900 transition-colors flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.18em] mb-2">
                Seller Program
              </div>
              <div className="font-bold text-lg leading-tight mb-1">판매자 시작하기</div>
              <div className="text-sm text-gray-500">지금 바로 판매를 시작해보세요</div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 border border-gray-800 group-hover:border-gray-700 transition-colors ml-4">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </a>
        </div>

      </div>

      <CartSummary />

      {/* Footer */}
      <footer className="bg-gray-950 text-white mt-12">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 xl:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-10">
            <div>
              <div className="text-[20px] font-black mb-4 tracking-tight">
                <span className="text-red-500">Live</span>Mart
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                빠른 배송과 최저가로<br />만족스러운 쇼핑 경험을<br />제공합니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-400 text-xs uppercase tracking-[0.12em]">쇼핑</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><a href="/products" className="hover:text-gray-300 transition-colors">전체 상품</a></li>
                <li><a href="/search" className="hover:text-gray-300 transition-colors">검색</a></li>
                <li><a href="/cart" className="hover:text-gray-300 transition-colors">장바구니</a></li>
                <li><a href="/wishlist" className="hover:text-gray-300 transition-colors">위시리스트</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-400 text-xs uppercase tracking-[0.12em]">고객센터</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><a href="/my-orders" className="hover:text-gray-300 transition-colors">주문 내역</a></li>
                <li><a href="/returns" className="hover:text-gray-300 transition-colors">반품/환불</a></li>
                <li><a href="/notifications" className="hover:text-gray-300 transition-colors">알림</a></li>
                <li><a href="/profile" className="hover:text-gray-300 transition-colors">내 정보</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-400 text-xs uppercase tracking-[0.12em]">비즈니스</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><a href="/seller" className="hover:text-gray-300 transition-colors">판매자센터</a></li>
                <li><a href="/admin" className="hover:text-gray-300 transition-colors">관리자</a></li>
                <li><a href="/seller/products" className="hover:text-gray-300 transition-colors">상품 등록</a></li>
                <li><a href="/admin/coupons" className="hover:text-gray-300 transition-colors">쿠폰 관리</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-700 text-xs">© 2026 LiveMart. All rights reserved.</p>
            <div className="flex items-center gap-5 text-xs text-gray-700">
              <a href="#" className="hover:text-gray-400 transition-colors">이용약관</a>
              <a href="#" className="hover:text-gray-400 transition-colors">개인정보처리방침</a>
              <a href="#" className="hover:text-gray-400 transition-colors">고객센터</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
