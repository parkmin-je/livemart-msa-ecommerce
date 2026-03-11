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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * AI 개인화 상품 추천 섹션
 * 로그인한 사용자에게만 노출
 * - 구매 이력 기반 GPT-4o-mini 추천
 * - 10분 Redis 캐싱 (cached badge 표시)
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
      const res = await fetch(`${API_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: parseInt(uid),
          purchasedProductIds: [],       // 실제로는 구매 이력 API에서 가져와야 함
          purchasedCategories: [],
          availableProductNames: [       // 실제로는 상품 API에서 가져와야 함
            '삼성 갤럭시 S25', '애플 아이폰 16', '소니 WH-1000XM5', '애플 에어팟 Pro',
            '나이키 에어맥스', '아디다스 울트라부스트', '뉴발란스 990v6',
            '아모레퍼시픽 쿠션', '설화수 자음생 크림', '이니스프리 그린티 세럼',
            '비비고 왕교자', '오뚜기 진라면', '농심 신라면',
          ],
          count: 4,
        }),
      });

      if (!res.ok) return;
      const data: RecommendationResponse = await res.json();
      setRecommendations(data.recommendations);
      setReasoning(data.reasoning);
      setCached(data.cached);
    } catch {
      // AI 서비스 불가 시 섹션 숨김
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
              {/* 상품 이미지 플레이스홀더 */}
              <div className="aspect-square bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg mb-2 flex items-center justify-center border border-purple-100 group-hover:border-purple-300 transition-colors relative overflow-hidden">
                <span className="text-2xl font-black text-purple-300">
                  {item.productName[0]}
                </span>
                {/* 연관도 배지 */}
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

      {/* 안내 텍스트 */}
      <p className="text-[10px] text-gray-400 mt-3 text-right">
        구매 이력을 학습해 개인화된 추천을 제공합니다
      </p>
    </section>
  );
}
