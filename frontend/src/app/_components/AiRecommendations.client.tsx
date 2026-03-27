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

/**
 * 개인화 상품 추천 섹션 — 구매 이력 + 실제 상품 목록 기반
 * - GET /api/orders/user/{userId}?page=0&size=10  → 최근 주문에서 productIds, categories 추출
 * - GET /api/products?page=0&size=50              → 추천 후보 상품 목록
 * - POST /api/ai/recommend                        → AI 추천 (10분 Redis 캐시, OpenRouter 연동)
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
      // 1. 구매 이력 + 상품 목록 병렬 fetch — Next.js rewrite → api-gateway(8888)
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`/api/orders/user/${uid}?page=0&size=10`, { credentials: 'include' }),
        fetch('/api/products?page=0&size=50', { credentials: 'include' }),
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

      // 4. AI 추천 요청 — Next.js rewrite → api-gateway(8888)
      const res = await fetch('/api/ai/recommend', {
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
      setRecommendations(data.recommendations ?? []);
      setReasoning(data.reasoning ?? '');
      setCached(data.cached ?? false);
    } catch {
      // 서비스 불가 시 섹션 숨김 (정상 폴백)
    } finally {
      setLoading(false);
    }
  };

  // 비로그인 또는 추천 없으면 렌더링 생략
  if (!userId || (!loading && recommendations.length === 0)) return null;

  return (
    <section style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: '#E8001D' }}>
            AI Picks
          </div>
          <div className="flex items-baseline gap-3">
            <h2
              className="font-bebas tracking-wide leading-none"
              style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', color: '#0E0E0E', letterSpacing: '0.03em' }}
            >
              맞춤 추천
            </h2>
            {cached && (
              <span className="text-[10px] font-bold hidden sm:block" style={{ color: 'rgba(14,14,14,0.3)' }}>
                캐시됨
              </span>
            )}
          </div>
        </div>
        <a
          href="/products"
          className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wider pb-0.5 flex-shrink-0 ml-4"
          style={{ color: 'rgba(14,14,14,0.35)', borderBottom: '1px solid rgba(14,14,14,0.15)' }}
        >
          전체보기
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* 추천 근거 */}
      {reasoning && (
        <p
          className="text-xs mb-5 pb-5 leading-relaxed"
          style={{ color: 'rgba(14,14,14,0.38)', borderBottom: '1px solid rgba(14,14,14,0.06)', wordBreak: 'keep-all' }}
        >
          {reasoning}
        </p>
      )}

      {/* 로딩 스켈레톤 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div
                className="aspect-square mb-2.5"
                style={{
                  background: 'linear-gradient(90deg, #EDEBE4 0%, #E4E1D8 50%, #EDEBE4 100%)',
                  backgroundSize: '600px 100%',
                  animation: 'shimmer 1.8s ease-in-out infinite',
                }}
              />
              <div className="h-2.5 mb-1.5" style={{ background: '#EDEBE4', width: '75%', animation: 'pulse 1.8s ease-in-out infinite' }} />
              <div className="h-2.5" style={{ background: '#EDEBE4', width: '50%', animation: 'pulse 1.8s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recommendations.map((item, i) => (
            <a
              key={i}
              href={`/search?q=${encodeURIComponent(item.productName)}`}
              className="group block"
            >
              <div
                className="aspect-square mb-2.5 flex items-center justify-center relative overflow-hidden transition-colors"
                style={{
                  background: '#F5F4F0',
                  border: '1px solid rgba(14,14,14,0.06)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.14)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.06)'; }}
              >
                <svg className="w-9 h-9" style={{ color: '#C8C4BC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span
                  className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 leading-none"
                  style={{ background: 'rgba(255,255,255,0.9)', color: 'rgba(14,14,14,0.45)' }}
                >
                  {item.category}
                </span>
              </div>
              <p
                className="text-xs font-semibold line-clamp-2 leading-snug mb-1 transition-colors"
                style={{ color: '#2A2A2A', wordBreak: 'keep-all' }}
              >
                {item.productName}
              </p>
              <p className="text-[10px] line-clamp-1 leading-relaxed" style={{ color: 'rgba(14,14,14,0.38)' }}>
                {item.reason}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
