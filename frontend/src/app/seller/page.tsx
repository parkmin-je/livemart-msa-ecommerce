'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ProductSummary {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  status: string;
  averageRating: number;
  reviewCount: number;
}

interface DashboardData {
  sellerId: number;
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  topProducts: ProductSummary[];
  categoryDistribution: Record<string, number>;
}

export default function SellerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const sellerId = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('sellerId') || '1') : 1;

  useEffect(() => {
    fetch(`${API_BASE}/api/sellers/${sellerId}/dashboard`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sellerId]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      ACTIVE: '판매중', INACTIVE: '비활성', OUT_OF_STOCK: '품절',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[status] || config.ACTIVE}`}>
        {labels[status] || status}
      </span>
    );
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
    ));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/seller/products" className="text-sm text-gray-700 hover:text-blue-600">상품관리</a>
              <a href="/seller/orders" className="text-sm text-gray-700 hover:text-blue-600">주문관리</a>
              <a href="/seller/inventory" className="text-sm text-gray-700 hover:text-blue-600">재고관리</a>
              <span className="text-sm font-medium text-blue-600">대시보드</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">판매자 대시보드</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">전체 상품</div>
            <div className="text-3xl font-bold text-gray-900">{data?.totalProducts || 0}</div>
            <div className="text-xs text-green-600 mt-1">활성 {data?.activeProducts || 0}개</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">총 매출</div>
            <div className="text-3xl font-bold text-blue-600">
              ₩{(data?.totalRevenue || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">평균 평점</div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900">{data?.averageRating || 0}</span>
              <div className="flex text-sm">{renderStars(data?.averageRating || 0)}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">리뷰 {data?.totalReviews || 0}개</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">품절 상품</div>
            <div className={`text-3xl font-bold ${(data?.outOfStockProducts || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {data?.outOfStockProducts || 0}
            </div>
            {(data?.outOfStockProducts || 0) > 0 && (
              <div className="text-xs text-red-500 mt-1">재입고 필요</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-gray-900">내 상품 목록</h2>
              </div>
              <div className="divide-y">
                {(data?.topProducts || []).map(product => (
                  <div key={product.id} className="p-6 flex items-center gap-4 hover:bg-gray-50">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                        {getStatusBadge(product.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>₩{product.price?.toLocaleString()}</span>
                        <span>재고 {product.stockQuantity}개</span>
                        <span className="flex items-center gap-1">
                          {renderStars(product.averageRating)}
                          <span>({product.reviewCount})</span>
                        </span>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${product.stockQuantity <= 5 ? 'text-red-600' : 'text-gray-500'}`}>
                      {product.stockQuantity <= 0 ? '품절' : product.stockQuantity <= 5 ? '재고 부족' : '정상'}
                    </div>
                  </div>
                ))}
                {(!data?.topProducts || data.topProducts.length === 0) && (
                  <div className="p-12 text-center text-gray-500">등록된 상품이 없습니다.</div>
                )}
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">카테고리 분포</h2>
              {data?.categoryDistribution && Object.keys(data.categoryDistribution).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(data.categoryDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => {
                      const total = data.totalProducts || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{category}</span>
                            <span className="text-gray-500">{count}개 ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 rounded-full h-2" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">카테고리 데이터 없음</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 메뉴</h2>
              <div className="space-y-2">
                <a href="/seller/products" className="block w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium">
                  상품 관리
                </a>
                <a href="/seller/orders" className="block w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm font-medium">
                  주문 관리
                </a>
                <a href="/seller/inventory" className="block w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium">
                  재고 관리
                </a>
                <a href="/admin" className="block w-full text-left px-4 py-3 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition text-sm font-medium">
                  관리자 패널
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
