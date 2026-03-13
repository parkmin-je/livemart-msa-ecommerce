'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { searchApi } from '@/api/productApi';

const CATEGORIES = [
  { label: '전자기기', href: '/products?cat=1' },
  { label: '패션', href: '/products?cat=2' },
  { label: '식품', href: '/products?cat=3' },
  { label: '홈/리빙', href: '/products?cat=4' },
  { label: '뷰티', href: '/products?cat=5' },
  { label: '스포츠', href: '/products?cat=6' },
  { label: '전체상품', href: '/products' },
];

function MobileBottomNav() {
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);

  const items = [
    {
      href: '/', label: '홈',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 22V12h6v10"/></svg>,
    },
    {
      href: '/products', label: '카테고리',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>,
    },
    {
      href: '/search', label: '검색',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
    },
    {
      href: '/cart', label: '장바구니', badge: totalQty,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
    },
    {
      href: '/profile', label: '마이',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-5 h-14">
        {items.map(({ href, label, icon, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <a key={href} href={href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`}>
              <div className="relative">
                {icon}
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

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
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    setUserName(localStorage.getItem('userName'));
    setUserRole(localStorage.getItem('userRole'));
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
    } catch (_) {}
    ['userId', 'userName', 'userRole'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
        {/* 상단 안내 바 */}
        <div className="bg-gray-950 text-white text-xs">
          <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-between h-8">
            <span className="text-gray-500 hidden sm:block">LiveMart — 빠른배송 · 최저가 · 안전결제</span>
            <div className="flex items-center gap-5 ml-auto">
              {userName ? (
                <>
                  <span className="text-gray-400">{userName}님 환영합니다</span>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">로그아웃</button>
                </>
              ) : (
                <>
                  <a href="/auth" className="text-gray-400 hover:text-white transition-colors">로그인</a>
                  <a href="/auth" className="text-gray-400 hover:text-white transition-colors">회원가입</a>
                </>
              )}
              <a href="/seller" className="text-gray-500 hover:text-white transition-colors hidden md:block">판매자센터</a>
              {userRole === 'ADMIN' && (
                <a href="/admin" className="text-yellow-400 hover:text-yellow-300 transition-colors hidden md:block font-medium">관리자</a>
              )}
            </div>
          </div>
        </div>

        {/* 메인 헤더 */}
        <div className="border-b border-gray-100">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex items-center gap-5 h-16">
              {/* 로고 */}
              <a href="/" className="flex-shrink-0">
                <span className="text-[22px] font-black tracking-tight">
                  <span className="text-red-600">Live</span>
                  <span className="text-gray-900">Mart</span>
                </span>
              </a>

              {/* 검색창 */}
              <div ref={searchContainerRef} className="relative flex-1 max-w-2xl">
                <form onSubmit={(e) => { setShowSuggestions(false); handleSearch(e); }}>
                  <div className="flex rounded overflow-hidden border border-gray-300 focus-within:border-red-500 transition-colors bg-white">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="상품, 브랜드를 검색해보세요"
                      className="flex-1 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none bg-white"
                      autoComplete="off"
                    />
                    <button type="submit" className="px-5 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 font-semibold text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="hidden sm:inline">검색</span>
                    </button>
                  </div>
                </form>
                {/* 자동완성 */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded shadow-xl border border-gray-100 z-[60] overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button key={i} type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery(s);
                          setShowSuggestions(false);
                          router.push(`/search?q=${encodeURIComponent(s)}`);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 우측 아이콘들 */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <a href="/wishlist" className="hidden sm:flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-[11px]">위시리스트</span>
                </a>
                <a href="/my-orders" className="hidden md:flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-[11px]">주문내역</span>
                </a>
                <a href={userName ? '/profile' : '/auth'} className="hidden md:flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-[11px]">{userName ? '내정보' : '로그인'}</span>
                </a>
                <a href="/cart" className="flex flex-col items-center gap-0.5 px-3 py-2 text-gray-500 hover:text-gray-900 transition-colors rounded relative">
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {totalQty > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 leading-none">
                        {totalQty > 99 ? '99+' : totalQty}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px]">장바구니</span>
                </a>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-500 rounded hover:bg-gray-100 ml-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 카테고리 네비 — 텍스트 전용, 밑줄 호버 */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex items-center overflow-x-auto scrollbar-thin">
              {CATEGORIES.map((cat) => {
                const isActive = pathname.includes(cat.href.split('?')[0]) && cat.href !== '/products'
                  ? false
                  : pathname === cat.href;
                return (
                  <a
                    key={cat.label}
                    href={cat.href}
                    className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                      isActive
                        ? 'text-gray-900 border-red-600'
                        : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-400'
                    }`}
                  >
                    {cat.label}
                  </a>
                );
              })}
              <div className="ml-auto pl-4 flex-shrink-0 border-l border-gray-100">
                <a href="/notifications" className="flex items-center gap-1.5 px-3 py-3 text-sm text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  알림
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg animate-fadeInUp">
            <div className="max-w-[1280px] mx-auto px-4 py-3 space-y-0.5">
              {CATEGORIES.map((cat) => (
                <a key={cat.label} href={cat.href} className="flex items-center px-3 py-2.5 rounded text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                  {cat.label}
                </a>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
                <a href="/my-orders" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  주문내역
                </a>
                <a href="/wishlist" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  위시리스트
                </a>
                <a href="/notifications" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  알림
                </a>
                <a href={userName ? '/profile' : '/auth'} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  {userName ? `${userName} (내 정보)` : '로그인 / 회원가입'}
                </a>
              </div>
            </div>
          </div>
        )}
      </header>
      {/* 헤더 높이 여백 */}
      <div className="h-[140px]" aria-hidden />
      <MobileBottomNav />
    </>
  );
}
