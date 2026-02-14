'use client';

import { useEffect, useState } from 'react';
import { ProductList } from '@/components/ProductList';
import { RealtimeDashboard } from '@/components/RealtimeDashboard';
import { CartSummary } from '@/components/CartSummary';
import { useCartStore } from '@/store/cartStore';

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const cartItems = useCartStore((state) => state.items);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">🛒 LiveMart</h1>
              <span className="ml-3 text-sm text-gray-500">MSA E-Commerce</span>
            </div>

            <nav className="flex items-center space-x-4">
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                📊 대시보드
              </button>

              <a
                href="/test"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                🧪 통합 테스트
              </a>

              <a
                href="/my-orders"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                📦 내 주문
              </a>

              <a
                href="/auth"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                🔐 로그인
              </a>

              <a
                href="/orders"
                className="relative px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                🛒 주문하기
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Realtime Dashboard (Optional) */}
      {showDashboard && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RealtimeDashboard />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-4xl font-bold mb-4">
            실시간 대규모 트래픽 처리 가능한<br />
            엔터프라이즈 E-Commerce 플랫폼
          </h2>
          <p className="text-xl mb-6 opacity-90">
            MSA, Event-Driven, WebFlux 기반 고성능 쇼핑몰
          </p>
          <div className="flex space-x-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-3xl font-bold">3,500</div>
              <div className="text-sm opacity-80">RPS 처리량</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-3xl font-bold">80ms</div>
              <div className="text-sm opacity-80">P95 응답시간</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-3xl font-bold">100K</div>
              <div className="text-sm opacity-80">동시 연결</div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
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

              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                필터 적용
              </button>
            </div>
          </div>

          {/* Products */}
          <div className="lg:col-span-3">
            <ProductList />
          </div>
        </div>

        {/* Cart Summary (Bottom Right) */}
        {cartItems.length > 0 && <CartSummary />}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">LiveMart</h3>
              <p className="text-gray-400 text-sm">
                MSA 기반 엔터프라이즈 E-Commerce 플랫폼
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">기술 스택</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• Spring Boot 3.4.1 + Java 21</li>
                <li>• Kafka Streams + Event Sourcing</li>
                <li>• Redis Cluster + Redis Streams</li>
                <li>• Spring AI + OpenTelemetry</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">성능</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• 3,500 RPS 처리</li>
                <li>• 80ms P95 응답시간</li>
                <li>• 100K 동시 연결</li>
                <li>• 95% 캐시 Hit Rate</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
            © 2026 LiveMart. Made with ❤️ by LiveMart Team
          </div>
        </div>
      </footer>
    </main>
  );
}
