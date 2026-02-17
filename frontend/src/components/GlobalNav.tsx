'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

export function GlobalNav() {
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const [userName, setUserName] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('userName');
    setUserName(name);
  }, []);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/products', label: '상품' },
    { href: '/search', label: '검색' },
    { href: '/my-orders', label: '내 주문' },
    { href: '/wishlist', label: '위시리스트' },
    { href: '/notifications', label: '알림' },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive(link.href) ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a href="/cart" className="relative px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
              장바구니
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </a>

            {userName ? (
              <div className="hidden md:flex items-center gap-2">
                <a href="/profile" className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 font-medium transition">{userName}</a>
                <a href="/seller" className="px-3 py-2 text-sm text-gray-500 hover:text-blue-600 transition">판매자</a>
                <a href="/admin" className="px-3 py-2 text-sm text-gray-500 hover:text-blue-600 transition">관리자</a>
              </div>
            ) : (
              <a href="/auth" className="hidden md:inline-flex px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition">로그인</a>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t pb-4">
            <div className="flex flex-col gap-1 pt-2">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className={`px-3 py-2 rounded-lg text-sm ${isActive(link.href) ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}>
                  {link.label}
                </a>
              ))}
              <div className="border-t mt-2 pt-2">
                <a href="/profile" className="block px-3 py-2 text-sm text-gray-600">프로필</a>
                <a href="/seller" className="block px-3 py-2 text-sm text-gray-600">판매자</a>
                <a href="/admin" className="block px-3 py-2 text-sm text-gray-600">관리자</a>
                <a href="/auth" className="block px-3 py-2 text-sm text-gray-600">로그인</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
