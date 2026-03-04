'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

const CATEGORIES = [
  { label: '전자기기', emoji: '📱', href: '/search?cat=1' },
  { label: '패션', emoji: '👗', href: '/search?cat=2' },
  { label: '식품', emoji: '🍎', href: '/search?cat=3' },
  { label: '홈/리빙', emoji: '🏠', href: '/search?cat=4' },
  { label: '뷰티', emoji: '💄', href: '/search?cat=5' },
  { label: '스포츠', emoji: '⚽', href: '/search?cat=6' },
  { label: '전체상품', emoji: '🛍️', href: '/products' },
];

export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    setUserName(localStorage.getItem('userName'));
    setUserRole(localStorage.getItem('userRole'));
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = async () => {
    // 1. Spring Security 서버 세션 무효화 (OAuth2 자동 재인증 방지)
    try {
      await fetch('/api/users/session-logout', {
        method: 'POST',
        credentials: 'include',  // JSESSIONID 쿠키 전송
      });
    } catch (_) {
      // 서버 오류여도 로컬 로그아웃은 진행
    }
    // 2. 로컬 토큰 삭제
    ['token', 'refreshToken', 'userId', 'userName', 'userRole', 'apiKey'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
        {/* 상단 안내 바 */}
        <div className="bg-gray-900 text-white text-xs">
          <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-between h-8">
            <span className="text-gray-300 hidden sm:block">🚀 LiveMart — 빠른배송 · 최저가 · 안전결제</span>
            <div className="flex items-center gap-4 ml-auto">
              {userName ? (
                <>
                  <span className="text-gray-300">{userName}님 환영합니다</span>
                  <button onClick={handleLogout} className="text-gray-400 hover:text-white transition">로그아웃</button>
                </>
              ) : (
                <>
                  <a href="/auth" className="text-gray-300 hover:text-white transition">로그인</a>
                  <a href="/auth" className="text-gray-300 hover:text-white transition">회원가입</a>
                </>
              )}
              <a href="/seller" className="text-gray-300 hover:text-white transition hidden md:block">판매자센터</a>
              {userRole === 'ADMIN' && (
                <a href="/admin" className="text-yellow-300 hover:text-yellow-100 transition hidden md:block font-semibold">관리자</a>
              )}
            </div>
          </div>
        </div>

        {/* 메인 헤더 */}
        <div className="border-b border-gray-100">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex items-center gap-4 h-16">
              {/* 로고 */}
              <a href="/" className="flex-shrink-0">
                <span className="text-2xl font-black tracking-tight">
                  <span className="text-red-600">Live</span>
                  <span className="text-gray-900">Mart</span>
                </span>
              </a>

              {/* 검색창 */}
              <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
                <div className="flex rounded-lg overflow-hidden border-2 border-red-600 focus-within:border-red-700 transition-colors">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="상품, 브랜드를 검색해보세요"
                    className="flex-1 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none bg-white"
                  />
                  <button type="submit" className="px-5 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 font-semibold text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="hidden sm:inline">검색</span>
                  </button>
                </div>
              </form>

              {/* 우측 아이콘들 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <a href="/wishlist" className="hidden sm:flex flex-col items-center gap-0.5 px-3 py-1 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-xs font-medium">위시리스트</span>
                </a>
                <a href="/my-orders" className="hidden md:flex flex-col items-center gap-0.5 px-3 py-1 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-xs font-medium">주문내역</span>
                </a>
                <a href={userName ? '/profile' : '/auth'} className="hidden md:flex flex-col items-center gap-0.5 px-3 py-1 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs font-medium">{userName ? '내정보' : '로그인'}</span>
                </a>
                <a href="/cart" className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 relative">
                  <div className="relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {totalQty > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                        {totalQty > 99 ? '99+' : totalQty}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">장바구니</span>
                </a>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-600 rounded-lg hover:bg-gray-100 ml-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 카테고리 네비 */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex items-center overflow-x-auto scrollbar-thin">
              {CATEGORIES.map((cat) => (
                <a
                  key={cat.label}
                  href={cat.href}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors rounded-md"
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </a>
              ))}
              <div className="ml-auto pl-4 flex-shrink-0 border-l border-gray-100">
                <a href="/notifications" className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap">
                  🔔 알림
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg animate-fadeInUp">
            <div className="max-w-[1280px] mx-auto px-4 py-3 space-y-1">
              {CATEGORIES.map((cat) => (
                <a key={cat.label} href={cat.href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <span className="text-lg">{cat.emoji}</span>{cat.label}
                </a>
              ))}
              <div className="border-t mt-2 pt-2 space-y-1">
                <a href="/my-orders" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">📋 주문내역</a>
                <a href="/wishlist" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">❤️ 위시리스트</a>
                <a href="/notifications" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">🔔 알림</a>
                <a href={userName ? '/profile' : '/auth'} className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  👤 {userName ? `${userName} (내 정보)` : '로그인 / 회원가입'}
                </a>
              </div>
            </div>
          </div>
        )}
      </header>
      {/* 헤더 높이만큼 여백 (상단바 32px + 메인헤더 64px + 카테고리바 44px = 140px) */}
      <div className="h-[140px]" aria-hidden />
    </>
  );
}
