import { Suspense } from 'react';
import { ProductGrid } from './ProductGrid';
import { AiRecommendations } from './AiRecommendations';
import { ProductsNav } from './ProductsNav';

export const metadata = {
  title: 'LiveMart - 전체 상품',
  description: '상품 목록',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getProducts() {
  const res = await fetch(`${API_BASE}/api/products?page=0&size=20`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.content ?? data ?? [];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-gray-50">
      <ProductsNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">전체 상품</h1>

        {/* AI 추천 섹션 */}
        <Suspense fallback={
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
            <div className="flex space-x-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 w-48 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        }>
          <AiRecommendations />
        </Suspense>

        <ProductGrid products={products} />
      </div>
    </main>
  );
}
