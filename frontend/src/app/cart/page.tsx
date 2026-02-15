'use client';

import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalAmount } = useCartStore();

  const totalAmount = getTotalAmount();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">상품 목록</a>
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">장바구니</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-16 shadow-sm text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">장바구니가 비어있습니다</h2>
            <p className="text-gray-500 mb-6">마음에 드는 상품을 담아보세요!</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition"
            >
              상품 둘러보기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">총 {items.length}개 상품</span>
                <button
                  onClick={clearCart}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  전체 삭제
                </button>
              </div>

              {items.map((item) => (
                <div key={item.productId} className="bg-white rounded-xl p-6 shadow-sm flex gap-6">
                  <div
                    className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
                    onClick={() => router.push(`/products/${item.productId}`)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3
                      className="font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600"
                      onClick={() => router.push(`/products/${item.productId}`)}
                    >
                      {item.name}
                    </h3>
                    <div className="text-lg font-bold text-blue-600 mb-3">
                      ₩{item.price.toLocaleString()}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                        >-</button>
                        <span className="px-3 py-1 font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                        >+</button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-700">
                          ₩{(item.price * item.quantity).toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-gray-400 hover:text-red-500 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-6">주문 요약</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>상품 금액</span>
                    <span>₩{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>배송비</span>
                    <span className={totalAmount >= 50000 ? 'text-green-600' : ''}>
                      {totalAmount >= 50000 ? '무료' : '₩3,000'}
                    </span>
                  </div>
                  {totalAmount < 50000 && (
                    <div className="text-xs text-gray-400">
                      ₩{(50000 - totalAmount).toLocaleString()} 더 구매 시 무료배송
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>총 결제 금액</span>
                    <span className="text-blue-600">
                      ₩{(totalAmount + (totalAmount >= 50000 ? 0 : 3000)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Coupon Input */}
                <div className="mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="쿠폰 코드 입력"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition">
                      적용
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/orders')}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  주문하기 ({items.reduce((sum, i) => sum + i.quantity, 0)}개)
                </button>

                <button
                  onClick={() => router.push('/products')}
                  className="w-full mt-3 text-gray-600 py-2 text-sm hover:text-blue-600 transition"
                >
                  계속 쇼핑하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
