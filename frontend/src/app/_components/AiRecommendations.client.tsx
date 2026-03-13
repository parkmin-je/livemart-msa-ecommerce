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
 * 개인화 상품 추천 섹션 — 구매 이력 + 실제 상품 목록 기반
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
      // 서비스 불가 시 섹션 숨김 (정상 폴백)
    } finally {
      setLoading(false);
    }
  };

  // 비로그인 또는 추천 없으면 렌더링 생략
  if (!userId || (!loading && recommendations.length === 0)) return null;

  return (
    <section className="bg-white px-5 py-6 border-t border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">맞춤 추천</h2>
          {cached && (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              캐시
            </span>
          )}
        </div>
        <a href="/products" className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1">
          전체보기
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* 추천 근거 */}
      {reasoning && (
        <p className="text-xs text-gray-400 mb-4 pb-4 border-b border-gray-50 leading-relaxed">
          {reasoning}
        </p>
      )}

      {/* 로딩 스켈레톤 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-100 mb-2.5" />
              <div className="h-3 bg-gray-100 rounded-sm w-3/4 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded-sm w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recommendations.map((item, i) => (
            <a
              key={i}
              href={`/search?keyword=${encodeURIComponent(item.productName)}`}
              className="group block"
            >
              {/* Image placeholder */}
              <div className="aspect-square bg-gray-50 border border-gray-100 group-hover:border-gray-200 transition-colors mb-2.5 flex items-center justify-center relative overflow-hidden">
                <svg className="w-10 h-10 text-gray-200 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {/* Category tag */}
                <span className="absolute bottom-1.5 left-1.5 text-[9px] font-medium text-gray-400 bg-white/90 px-1.5 py-0.5 leading-none">
                  {item.category}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 group-hover:text-gray-950 transition-colors leading-snug mb-1">
                {item.productName}
              </p>
              <p className="text-[10px] text-gray-400 line-clamp-1 leading-relaxed">{item.reason}</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
