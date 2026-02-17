'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductList } from '@/components/ProductList';
import { RealtimeDashboard } from '@/components/RealtimeDashboard';
import { CartSummary } from '@/components/CartSummary';
import { GlobalNav } from '@/components/GlobalNav';
import { useCartStore } from '@/store/cartStore';

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cartItems = useCartStore((state) => state.items);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <GlobalNav />

      {/* Realtime Dashboard (Optional) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={() => setShowDashboard(!showDashboard)}
          className="text-sm text-gray-500 hover:text-blue-600 transition"
        >
          {showDashboard ? '대시보드 숨기기' : '실시간 대시보드 보기'}
        </button>
      </div>
      {showDashboard && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RealtimeDashboard />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section + Search */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            실시간 대규모 트래픽 처리 가능한<br />
            엔터프라이즈 E-Commerce 플랫폼
          </h2>
          <p className="text-lg mb-6 opacity-90">
            MSA, Event-Driven, WebFlux 기반 고성능 쇼핑몰
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-xl mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품을 검색해보세요..."
                className="w-full px-5 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button type="submit" className="absolute right-2 top-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition">검색</button>
            </div>
          </form>

          <div className="flex flex-wrap gap-4">
            {[
              { value: '3,500', label: 'RPS 처리량' },
              { value: '80ms', label: 'P95 응답시간' },
              { value: '100K', label: '동시 연결' },
              { value: '95%', label: '캐시 Hit Rate' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/20 backdrop-blur-sm rounded-lg px-5 py-3">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Quick Links */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: '전자제품', emoji: '\u{1F4F1}', cat: 'ELECTRONICS' },
            { label: '패션', emoji: '\u{1F45A}', cat: 'FASHION' },
            { label: '식품', emoji: '\u{1F34E}', cat: 'FOOD' },
            { label: '홈/리빙', emoji: '\u{1F3E0}', cat: 'HOME' },
            { label: '뷰티', emoji: '\u{1F484}', cat: 'BEAUTY' },
            { label: '스포츠', emoji: '\u26BD', cat: 'SPORTS' },
          ].map((c) => (
            <a
              key={c.cat}
              href={`/search?q=${c.cat}`}
              className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition"
            >
              <div className="text-2xl mb-1">{c.emoji}</div>
              <div className="text-sm font-medium text-gray-700">{c.label}</div>
            </a>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-semibold mb-4">필터</h3>
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">카테고리</h4>
                <div className="space-y-2">
                  {['전자기기', '패션', '식품', '도서', '가전'].map((cat) => (
                    <label key={cat} className="flex items-center">
                      <input type="checkbox" className="rounded text-blue-600" />
                      <span className="ml-2 text-sm text-gray-600">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">가격대</h4>
                <input type="range" className="w-full" />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>0원</span>
                  <span>1,000,000원</span>
                </div>
              </div>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">필터 적용</button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <ProductList />
          </div>
        </div>

        {cartItems.length > 0 && <CartSummary />}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">LiveMart</h3>
              <p className="text-gray-400 text-sm">MSA 기반 엔터프라이즈 E-Commerce 플랫폼</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">쇼핑</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li><a href="/products" className="hover:text-white transition">전체 상품</a></li>
                <li><a href="/search" className="hover:text-white transition">상품 검색</a></li>
                <li><a href="/cart" className="hover:text-white transition">장바구니</a></li>
                <li><a href="/wishlist" className="hover:text-white transition">위시리스트</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">고객 서비스</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li><a href="/my-orders" className="hover:text-white transition">주문 내역</a></li>
                <li><a href="/returns" className="hover:text-white transition">반품/환불</a></li>
                <li><a href="/notifications" className="hover:text-white transition">알림</a></li>
                <li><a href="/profile" className="hover:text-white transition">내 정보</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">기술 스택</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>Spring Boot 3.4 + Java 21</li>
                <li>Kafka Streams + Event Sourcing</li>
                <li>Redis Cluster + Elasticsearch</li>
                <li>Next.js + TypeScript</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
            &copy; 2026 LiveMart. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
