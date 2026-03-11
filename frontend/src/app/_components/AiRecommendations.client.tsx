'use client';

import { useState, useEffect } from 'react';

interface RecommendedItem {
  productName: string;
  category: string;
  reason: string;
  relevanceScore: number;
}

interface RecommendationResponse {
  userId: number;
  recommendations: RecommendedItem[];
  reasoning: string;
  cached: boolean;
  latencyMs: number;
}

interface OrderItem {
  productId: number;
  productName: string;
  categoryId?: number;
}

interface Order {
  items?: OrderItem[];
}

interface Product {
  id: number;
  name: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * AI 개인화 상품 추천 섹션 — 구매 이력 + 실제 상품 목록 기반
 * - GET /api/orders/user/{userId}?page=0&size=10  → 최근 주문에서 productIds, categories 추출
 * - GET /api/products?page=0&size=50              → 추천 후보 상품 목록
 * - POST /api/ai/recommend                        → GPT-4o-mini 추천 (10분 Redis 캐시)
 */
export function AiRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    setUserId(id);
    if (id) loadRecommendations(id);
  }, []);

  const loadRecommendations = async (uid: string) => {
    setLoading(true);
    try {
      // 1. 구매 이력 + 상품 목록 병렬 fetch
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/api/orders/user/${uid}?page=0&size=10`, { credentials: 'include' }),
        fetch(`${API_URL}/api/products?page=0&size=50`, { credentials: 'include' }),
      ]);

      const ordersData = ordersRes.ok ? await ordersRes.json() : { content: [] };
      const productsData = productsRes.ok ? await productsRes.json() : { content: [] };

      const orders: Order[] = ordersData.content || [];
      const products: Product[] = productsData.content || [];

      // 2. 주문 이력에서 구매 상품 ID / 카테고리 추출 (중복 제거)
      const purchasedProductIds: number[] = [];
      const purchasedCategories: string[] = [];
      orders.forEach((order) => {
        (order.items || []).forEach((item) => {
          if (!purchasedProductIds.includes(item.productId)) {
            purchasedProductIds.push(item.productId);
          }
          if (item.categoryId && !purchasedCategories.includes(String(item.categoryId))) {
            purchasedCategories.push(String(item.categoryId));
          }
        });
      });

      // 3. 실제 상품 이름 목록 (최대 30개, 이미 구매한 상품 제외)
      const availableProductNames = products
        .filter((p) => !purchasedProductIds.includes(p.id))
        .slice(0, 30)
        .map((p) => p.name);

      // 상품이 없으면 추천 불가
      if (availableProductNames.length === 0) return;

      // 4. AI 추천 요청
      const res = await fetch(`${API_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: parseInt(uid),
          purchasedProductIds,
          purchasedCategories,
          availableProductNames,
          count: 4,
        }),
      });

      if (!res.ok) return;
      const data: RecommendationResponse = await res.json();
      setRecommendations(data.recommendations);
      setReasoning(data.reasoning);
      setCached(data.cached);
    } catch {
      // AI 서비스 불가 시 섹션 숨김 (정상 폴백)
    } finally {
      setLoading(false);
    }
  };

  // 비로그인 또는 추천 없으면 렌더링 생략
  if (!userId || (!loading && recommendations.length === 0)) return null;

  return (
    <section className="bg-white px-5 py-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <h2 className="text-[17px] font-bold text-gray-900">AI 맞춤 추천</h2>
          </div>
          {cached && (
            <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-sm">
              캐시
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">GPT-4o-mini 기반</span>
      </div>

      {/* 추천 근거 */}
      {reasoning && (
        <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-3 py-2 rounded-lg border-l-2 border-purple-300">
          {reasoning}
        </p>
      )}

      {/* 로딩 스켈레톤 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recommendations.map((item, i) => (
            <a
              key={i}
              href={`/search?keyword=${encodeURIComponent(item.productName)}`}
              className="group block"
            >
              <div className="aspect-square bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg mb-2 flex items-center justify-center border border-purple-100 group-hover:border-purple-300 transition-colors relative overflow-hidden">
                <span className="text-2xl font-black text-purple-300">
                  {item.productName[0]}
                </span>
                <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-purple-700 bg-white/80 px-1 py-0.5 rounded-sm">
                  {Math.round(item.relevanceScore * 100)}%
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 group-hover:text-purple-700 transition-colors leading-snug mb-0.5">
                {item.productName}
              </p>
              <p className="text-[10px] text-gray-400 line-clamp-1">{item.reason}</p>
            </a>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-3 text-right">
        구매 이력을 학습해 개인화된 추천을 제공합니다
      </p>
    </section>
  );
}
