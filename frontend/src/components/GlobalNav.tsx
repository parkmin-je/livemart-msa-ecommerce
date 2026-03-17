'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { searchApi } from '@/api/productApi';

// ── 카테고리 + 메가 메뉴 데이터 ─────────────────────────────
const CATEGORIES = [
  {
    label: '전자기기', href: '/products?cat=1',
    sub: [
      { label: '스마트폰', href: '/products?cat=1&sub=phone' },
      { label: '노트북', href: '/products?cat=1&sub=laptop' },
      { label: '태블릿', href: '/products?cat=1&sub=tablet' },
      { label: 'TV/모니터', href: '/products?cat=1&sub=display' },
      { label: '오디오', href: '/products?cat=1&sub=audio' },
      { label: '카메라', href: '/products?cat=1&sub=camera' },
    ],
    featured: { label: '이번주 특가', badge: '-30%', color: '#DC2626' },
  },
  {
    label: '패션', href: '/products?cat=2',
    sub: [
      { label: '남성의류', href: '/products?cat=2&sub=men' },
      { label: '여성의류', href: '/products?cat=2&sub=women' },
      { label: '신발', href: '/products?cat=2&sub=shoes' },
      { label: '가방', href: '/products?cat=2&sub=bag' },
      { label: '액세서리', href: '/products?cat=2&sub=acc' },
      { label: '스포츠웨어', href: '/products?cat=2&sub=sports' },
    ],
    featured: { label: '봄 신상', badge: 'NEW', color: '#059669' },
  },
  {
    label: '식품', href: '/products?cat=3',
    sub: [
      { label: '신선식품', href: '/products?cat=3&sub=fresh' },
      { label: '간편식', href: '/products?cat=3&sub=ready' },
      { label: '건강식품', href: '/products?cat=3&sub=health' },
      { label: '음료', href: '/products?cat=3&sub=drink' },
      { label: '과자/스낵', href: '/products?cat=3&sub=snack' },
      { label: '유제품', href: '/products?cat=3&sub=dairy' },
    ],
    featured: { label: '오늘의 신선', badge: 'FRESH', color: '#0891B2' },
  },
  {
    label: '홈/리빙', href: '/products?cat=4',
    sub: [
      { label: '가구', href: '/products?cat=4&sub=furniture' },
      { label: '침구/커튼', href: '/products?cat=4&sub=bedding' },
      { label: '조명', href: '/products?cat=4&sub=light' },
      { label: '주방용품', href: '/products?cat=4&sub=kitchen' },
      { label: '욕실용품', href: '/products?cat=4&sub=bath' },
      { label: '수납/정리', href: '/products?cat=4&sub=storage' },
    ],
    featured: { label: '홈인테리어', badge: '~40%', color: '#B45309' },
  },
  {
    label: '뷰티', href: '/products?cat=5',
    sub: [
      { label: '스킨케어', href: '/products?cat=5&sub=skin' },
      { label: '메이크업', href: '/products?cat=5&sub=makeup' },
      { label: '헤어케어', href: '/products?cat=5&sub=hair' },
      { label: '향수', href: '/products?cat=5&sub=perfume' },
      { label: '선케어', href: '/products?cat=5&sub=sun' },
      { label: '남성뷰티', href: '/products?cat=5&sub=men' },
    ],
    featured: { label: '뷰티 위크', badge: 'HOT', color: '#DB2777' },
  },
  {
    label: '스포츠', href: '/products?cat=6',
    sub: [
      { label: '운동기구', href: '/products?cat=6&sub=equip' },
      { label: '아웃도어', href: '/products?cat=6&sub=outdoor' },
      { label: '구기종목', href: '/products?cat=6&sub=ball' },
      { label: '수영/수상', href: '/products?cat=6&sub=swim' },
      { label: '사이클링', href: '/products?cat=6&sub=bike' },
      { label: '스포츠영양', href: '/products?cat=6&sub=nutrition' },
    ],
    featured: { label: '여름 준비', badge: 'EVENT', color: '#EA580C' },
  },
  { label: '전체상품', href: '/products', sub: [], featured: null },
];

// ── 모바일 하단 네비 ──────────────────────────────────────────
function MobileBottomNav() {
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);

  const items = [
    { href: '/', label: '홈', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>, icon2: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 22V12h6v10"/> },
    { href: '/products', label: '카테고리', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16"/> },
    { href: '/search', label: '검색', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/> },
    { href: '/cart', label: '장바구니', badge: totalQty, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/> },
    { href: '/profile', label: '마이', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-gray-200 md:hidden" style={{ backdropFilter: 'blur(12px)' }}>
      <div className="grid grid-cols-5 h-14">
        {items.map(({ href, label, icon, icon2, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <a key={href} href={href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`}
            >
              <div className="relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {icon}{icon2}
                </svg>
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

// ── 메가 메뉴 드롭다운 ────────────────────────────────────────
function MegaMenu({ category, onClose }: { category: typeof CATEGORIES[0]; onClose: () => void }) {
  if (!category.sub.length) return null;

  return (
    <div
      className="absolute top-full left-0 right-0 bg-white z-50 border-t border-gray-100"
      style={{
        boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
        animation: 'dropdownOpen 0.22s cubic-bezier(0.22,1,0.36,1) both',
      }}
      onMouseLeave={onClose}
    >
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 xl:px-12 py-5">
        <div className="flex gap-10">
          {/* 서브 카테고리 그리드 */}
          <div className="flex-1">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-3">
              {category.label} 카테고리
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-1.5">
              {category.sub.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-red-600 font-medium py-1 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-0 group-hover:w-1.5 h-[2px] bg-red-600 transition-all duration-200 overflow-hidden flex-shrink-0" />
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* 특가 배너 */}
          {category.featured && (
            <div className="hidden lg:flex flex-col justify-center flex-shrink-0 w-40">
              <a href={category.href} onClick={onClose}
                className="border border-gray-100 p-4 hover:border-gray-300 transition-colors group">
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 mb-2 inline-block"
                  style={{ background: category.featured.color, color: '#fff' }}
                >
                  {category.featured.badge}
                </span>
                <div className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                  {category.featured.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  보러가기
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const megaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    setUserName(localStorage.getItem('userName'));
    setUserRole(localStorage.getItem('userRole'));
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await searchApi.autocomplete(searchQuery);
        const list: string[] = Array.isArray(data) ? data : (data?.suggestions || []);
        setSuggestions(list.slice(0, 8));
        setShowSuggestions(list.length > 0);
      } catch {
        const fallback = [searchQuery, `${searchQuery} 추천`, `${searchQuery} 최저가`, `${searchQuery} 신상품`];
        setSuggestions(fallback);
        setShowSuggestions(true);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }, [searchQuery, router]);

  const handleLogout = useCallback(async () => {
    try { await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }); } catch (_) {}
    ['userId', 'userName', 'userRole'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  }, []);

  const handleMegaEnter = useCallback((label: string) => {
    if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
    setActiveMega(label);
  }, []);

  const handleMegaLeave = useCallback(() => {
    megaTimerRef.current = setTimeout(() => setActiveMega(null), 120);
  }, []);

  const handleMegaClose = useCallback(() => {
    if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
    setActiveMega(null);
  }, []);

  const activeCategoryData = CATEGORIES.find(c => c.label === activeMega);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,1)',
          backdropFilter: scrolled ? 'blur(20px) saturate(1.8)' : 'none',
          boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.08)' : '0 1px 0 rgba(0,0,0,0.06)',
          transition: 'background 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease',
        }}
      >
        {/* ── 상단 안내바 ── */}
        <div className="bg-gray-950 text-white text-xs">
          <div className="max-w-[1440px] mx-auto px-4">
            <div className="flex items-center h-8">
              {/* 마키 배송 알림 */}
              <div className="flex-1 overflow-hidden hidden sm:block">
                <div
                  className="flex gap-0 whitespace-nowrap"
                  style={{ animation: 'marquee 28s linear infinite' }}
                >
                  {[
                    '🚀 오늘 오후 2시까지 주문 시 내일 도착 보장',
                    '  ·  ',
                    '💳 신규가입 즉시 3,000원 쿠폰 지급',
                    '  ·  ',
                    '🎁 5만원 이상 구매 시 무료배송',
                    '  ·  ',
                    '⚡ 카드결제 5% 추가할인',
                    '  ·  ',
                    '🚀 오늘 오후 2시까지 주문 시 내일 도착 보장',
                    '  ·  ',
                    '💳 신규가입 즉시 3,000원 쿠폰 지급',
                    '  ·  ',
                    '🎁 5만원 이상 구매 시 무료배송',
                    '  ·  ',
                    '⚡ 카드결제 5% 추가할인',
                    '  ·  ',
                  ].map((text, i) => (
                    <span key={i} className="text-gray-400 text-[11px]">{text}</span>
                  ))}
                </div>
              </div>
              <div className="sm:hidden text-gray-400 text-[11px]">
                LiveMart — 빠른배송 · 최저가
              </div>
              {/* 오른쪽 유틸 */}
              <div className="flex items-center gap-4 ml-auto flex-shrink-0 text-[11px]">
                {userName ? (
                  <>
                    <span className="text-gray-500">{userName}님</span>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">로그아웃</button>
                  </>
                ) : (
                  <>
                    <a href="/auth" className="text-gray-500 hover:text-white transition-colors">로그인</a>
                    <a href="/auth" className="text-gray-500 hover:text-white transition-colors hidden sm:block">회원가입</a>
                  </>
                )}
                <a href="/seller" className="text-gray-500 hover:text-white transition-colors hidden md:block">판매자센터</a>
                {userRole === 'ADMIN' && (
                  <a href="/admin" className="text-yellow-400 hover:text-yellow-300 transition-colors hidden md:block font-bold">관리자</a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 메인 헤더 ── */}
        <div className="border-b border-gray-100">
          <div className="max-w-[1440px] mx-auto px-4">
            <div className="flex items-center gap-5 h-[60px]">
              {/* 로고 */}
              <a href="/" className="flex-shrink-0 group">
                <span className="text-[22px] font-black tracking-tight">
                  <span
                    className="text-red-600 transition-all duration-200"
                    style={{ textShadow: '0 0 20px rgba(220,38,38,0)' }}
                  >Live</span>
                  <span className="text-gray-950">Mart</span>
                </span>
              </a>

              {/* 검색창 — glassmorphism on scroll */}
              <div ref={searchContainerRef} className="relative flex-1 max-w-2xl">
                <form onSubmit={(e) => { setShowSuggestions(false); handleSearch(e); }}>
                  <div
                    className="flex overflow-hidden transition-all duration-300"
                    style={{
                      border: '1.5px solid',
                      borderColor: scrolled ? 'rgba(220,38,38,0.3)' : '#E5E7EB',
                      borderRadius: '2px',
                      background: scrolled ? 'rgba(255,255,255,0.92)' : '#fff',
                      backdropFilter: scrolled ? 'blur(8px)' : 'none',
                    }}
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="상품, 브랜드를 검색해보세요"
                      className="flex-1 px-4 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="px-5 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 font-bold text-[13px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="hidden sm:inline">검색</span>
                    </button>
                  </div>
                </form>

                {/* 자동완성 */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 z-[60] overflow-hidden"
                    style={{
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      animation: 'dropdownOpen 0.18s cubic-bezier(0.22,1,0.36,1) both',
                    }}
                  >
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery(s);
                          setShowSuggestions(false);
                          router.push(`/search?q=${encodeURIComponent(s)}`);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0 group"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 우측 아이콘 */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <a href="/wishlist" className="hidden sm:flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors group">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-[11px] font-medium">위시리스트</span>
                </a>
                <a href="/my-orders" className="hidden md:flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-[11px] font-medium">주문내역</span>
                </a>
                <a href={userName ? '/profile' : '/auth'} className="hidden md:flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-[11px] font-medium">{userName ? '내정보' : '로그인'}</span>
                </a>
                {/* 장바구니 — 뱃지 강화 */}
                <a href="/cart" className="flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors group relative">
                  <div className="relative">
                    <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {totalQty > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-black rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 leading-none"
                        style={{ animation: 'badgePop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
                      >
                        {totalQty > 99 ? '99+' : totalQty}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium">장바구니</span>
                </a>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-500 hover:bg-gray-100 ml-1"
                  aria-label="메뉴"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    }
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 카테고리 네비 + 메가 메뉴 ── */}
        <div
          className="bg-white border-b border-gray-150 relative"
          style={{ borderBottomColor: '#EBEBEB' }}
          onMouseLeave={handleMegaLeave}
        >
          <div className="max-w-[1440px] mx-auto px-4">
            <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {CATEGORIES.map((cat) => {
                const isActive = pathname === cat.href;
                const isMegaActive = activeMega === cat.label;
                return (
                  <div key={cat.label} className="relative flex-shrink-0">
                    <a
                      href={cat.href}
                      onMouseEnter={() => handleMegaEnter(cat.label)}
                      className={`px-3 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-all duration-200 -mb-px flex items-center gap-1 ${
                        isActive || isMegaActive
                          ? 'text-red-600 border-red-600'
                          : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      {cat.label}
                      {cat.sub.length > 0 && (
                        <svg
                          className={`w-3 h-3 transition-transform duration-200 ${isMegaActive ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </a>
                  </div>
                );
              })}

              <div className="ml-auto pl-4 flex-shrink-0 border-l border-gray-100">
                <a href="/notifications" className="flex items-center gap-1.5 px-3 py-3 text-[13px] text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  알림
                </a>
              </div>
            </div>
          </div>

          {/* 메가 메뉴 드롭다운 */}
          {activeMega && activeCategoryData && activeCategoryData.sub.length > 0 && (
            <MegaMenu category={activeCategoryData} onClose={handleMegaClose} />
          )}
        </div>

        {/* ── 모바일 메뉴 ── */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1)', animation: 'dropdownOpen 0.22s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div className="max-w-[1440px] mx-auto px-4 py-3 space-y-0.5">
              {CATEGORIES.map((cat) => (
                <a key={cat.label} href={cat.href} className="flex items-center justify-between px-3 py-2.5 text-[13px] text-gray-700 hover:bg-red-50 hover:text-red-700 font-medium transition-colors">
                  {cat.label}
                  {cat.sub.length > 0 && (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  )}
                </a>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
                {[
                  { href: '/my-orders', label: '주문내역' },
                  { href: '/wishlist', label: '위시리스트' },
                  { href: '/notifications', label: '알림' },
                  { href: userName ? '/profile' : '/auth', label: userName ? `${userName} (내 정보)` : '로그인 / 회원가입' },
                ].map(item => (
                  <a key={item.href} href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 헤더 높이 스페이서 */}
      <div className="h-[148px]" aria-hidden />
      <MobileBottomNav />
    </>
  );
}
