'use client';

import { useState } from 'react';

interface SellerAgentRequest {
  productName: string;
  category: string;
  keywords?: string;
  targetAudience?: string;
  priceRange?: string;
}

interface SellerAgentResponse {
  productName: string;
  shortDescription: string;
  fullDescription: string;
  sellingPoint: string;
  seoTags: string[];
  recommendedPrice: number;
  priceStrategy: string;
  recommendedStock: number;
  lowStockThreshold: number;
  demandScore: number;
  marketInsight: string;
  agentLog: string;
  demoMode: boolean;
}

const AGENT_STEPS = [
  { label: '시장 분석 중', icon: '📊' },
  { label: '가격 전략 수립', icon: '💰' },
  { label: '수요 예측', icon: '📈' },
  { label: '상품 설명 생성', icon: '✍️' },
  { label: '인사이트 도출', icon: '💡' },
];

const CATEGORIES = [
  '전자기기', '패션의류', '식품/음료', '뷰티/건강', '스포츠/레저',
  '홈/인테리어', '유아/완구', '도서/음반', '반려동물', '자동차용품', '기타',
];

function DemandScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-600 dark:text-gray-400">수요 점수</span>
        <span className={pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}>
          {pct}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SellerAgentPanel() {
  const [form, setForm] = useState<SellerAgentRequest>({
    productName: '',
    category: '',
    keywords: '',
    targetAudience: '',
    priceRange: '',
  });
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<SellerAgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const simulateSteps = async () => {
    for (let i = 0; i < AGENT_STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim() || !form.category) {
      setError('상품명과 카테고리는 필수입니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);

    // UI 애니메이션과 실제 API 호출을 병렬로
    const stepAnimation = simulateSteps();

    try {
      const payload: Record<string, string | number | undefined> = {
        productName: form.productName,
        category: form.category,
      };
      if (form.keywords?.trim()) payload.keywords = form.keywords;
      if (form.targetAudience?.trim()) payload.targetAudience = form.targetAudience;
      if (form.priceRange?.trim()) payload.priceRange = form.priceRange;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'}/api/ai/seller/agent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      await stepAnimation;

      if (!res.ok) {
        throw new Error(`서버 오류: ${res.status}`);
      }

      const data: SellerAgentResponse = await res.json();
      setResult(data);
    } catch (err) {
      await stepAnimation;
      setError(err instanceof Error ? err.message : '에이전트 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setCurrentStep(-1);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCurrentStep(-1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xl">
          🤖
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            셀러 AI 에이전트
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Hunter Alpha (MiMo-V2-Pro) 기반 · 상품명 입력만으로 가격/재고/설명 자동 완성
          </p>
        </div>
      </div>

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 상품명 */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="productName"
                value={form.productName}
                onChange={handleChange}
                placeholder="예: 무선 블루투스 이어폰 ANC"
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">카테고리 선택</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 희망 가격대 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                희망 가격대 (선택)
              </label>
              <input
                type="text"
                name="priceRange"
                value={form.priceRange}
                onChange={handleChange}
                placeholder="예: 20000-50000"
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* 키워드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                핵심 키워드 (선택)
              </label>
              <input
                type="text"
                name="keywords"
                value={form.keywords}
                onChange={handleChange}
                placeholder="예: 노이즈캔슬링, 30시간 배터리"
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* 타겟 고객 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                타겟 고객 (선택)
              </label>
              <input
                type="text"
                name="targetAudience"
                value={form.targetAudience}
                onChange={handleChange}
                placeholder="예: 20-30대 직장인"
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                에이전트 실행 중...
              </>
            ) : (
              <>
                <span>🚀</span>
                AI 에이전트 실행
              </>
            )}
          </button>
        </form>
      )}

      {/* Step Progress */}
      {loading && (
        <div className="border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-950/20">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">
            에이전트 실행 단계
          </p>
          <div className="space-y-2">
            {AGENT_STEPS.map((step, idx) => {
              const isDone = idx < currentStep;
              const isActive = idx === currentStep;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                    isDone
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isActive
                      ? 'text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  <span className="text-base">{isDone ? '✅' : isActive ? step.icon : '⏳'}</span>
                  <span>
                    STEP {idx + 1}: {step.label}
                  </span>
                  {isActive && (
                    <span className="ml-auto">
                      <span className="inline-block w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="space-y-4">
          {/* Mode Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                result.demoMode
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {result.demoMode ? '데모 모드' : 'Hunter Alpha 분석 완료'}
            </span>
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              다시 분석
            </button>
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">추천 판매가</p>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {result.recommendedPrice.toLocaleString()}원
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">권장 초기 재고</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {result.recommendedStock}개
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">재주문 임계값</p>
              <p className="text-lg font-bold text-orange-500 dark:text-orange-400">
                {result.lowStockThreshold}개
              </p>
            </div>
          </div>

          {/* Demand Score */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <DemandScoreBar score={result.demandScore} />
          </div>

          {/* Descriptions */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                한 줄 설명
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{result.shortDescription}</p>
            </div>
            <hr className="border-gray-100 dark:border-gray-700" />
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                상세 설명
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.fullDescription}</p>
            </div>
            <hr className="border-gray-100 dark:border-gray-700" />
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                핵심 판매 포인트
              </p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{result.sellingPoint}</p>
            </div>
          </div>

          {/* Price Strategy */}
          {result.priceStrategy && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                가격 전략
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{result.priceStrategy}</p>
            </div>
          )}

          {/* Market Insight */}
          {result.marketInsight && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                시장 진입 인사이트
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-300">{result.marketInsight}</p>
            </div>
          )}

          {/* SEO Tags */}
          {result.seoTags && result.seoTags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                SEO 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.seoTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-block text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Agent Log (collapsible) */}
          {result.agentLog && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 select-none list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                에이전트 실행 로그 보기
              </summary>
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                  {result.agentLog.split(' | ').join('\n')}
                </p>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
