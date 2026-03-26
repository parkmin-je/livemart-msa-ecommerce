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
  const barColor =
    pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  const textColor =
    pct >= 70 ? 'rgb(4,120,87)' : pct >= 40 ? 'rgb(161,98,7)' : '#DC2626';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span style={{ color: 'rgba(14,14,14,0.6)' }}>수요 점수</span>
        <span style={{ color: textColor }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(14,14,14,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid rgba(14,14,14,0.14)',
  color: '#0E0E0E',
  background: '#FFFFFF',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: 'rgba(14,14,14,0.7)',
  marginBottom: '4px',
};

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
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl"
          style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '10px' }}>
          🤖
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#0E0E0E' }}>
            셀러 AI 에이전트
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>
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
              <label style={labelStyle}>
                상품명 <span style={{ color: '#E8001D' }}>*</span>
              </label>
              <input
                type="text"
                name="productName"
                value={form.productName}
                onChange={handleChange}
                placeholder="예: 무선 블루투스 이어폰 ANC"
                disabled={loading}
                style={{ ...inputStyle, opacity: loading ? 0.5 : 1 }}
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label style={labelStyle}>
                카테고리 <span style={{ color: '#E8001D' }}>*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                disabled={loading}
                style={{ ...inputStyle, opacity: loading ? 0.5 : 1 }}
              >
                <option value="">카테고리 선택</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 희망 가격대 */}
            <div>
              <label style={labelStyle}>희망 가격대 (선택)</label>
              <input
                type="text"
                name="priceRange"
                value={form.priceRange}
                onChange={handleChange}
                placeholder="예: 20000-50000"
                disabled={loading}
                style={{ ...inputStyle, opacity: loading ? 0.5 : 1 }}
              />
            </div>

            {/* 키워드 */}
            <div>
              <label style={labelStyle}>핵심 키워드 (선택)</label>
              <input
                type="text"
                name="keywords"
                value={form.keywords}
                onChange={handleChange}
                placeholder="예: 노이즈캔슬링, 30시간 배터리"
                disabled={loading}
                style={{ ...inputStyle, opacity: loading ? 0.5 : 1 }}
              />
            </div>

            {/* 타겟 고객 */}
            <div>
              <label style={labelStyle}>타겟 고객 (선택)</label>
              <input
                type="text"
                name="targetAudience"
                value={form.targetAudience}
                onChange={handleChange}
                placeholder="예: 20-30대 직장인"
                disabled={loading}
                style={{ ...inputStyle, opacity: loading ? 0.5 : 1 }}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#E8001D' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'rgb(79,70,229)' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgb(67,56,202)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgb(79,70,229)')}
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
        <div className="p-4" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgb(79,70,229)' }}>
            에이전트 실행 단계
          </p>
          <div className="space-y-2">
            {AGENT_STEPS.map((step, idx) => {
              const isDone = idx < currentStep;
              const isActive = idx === currentStep;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 text-sm transition-all duration-300"
                  style={{
                    color: isDone ? 'rgb(4,120,87)'
                      : isActive ? 'rgb(67,56,202)'
                      : 'rgba(14,14,14,0.35)',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  <span className="text-base">{isDone ? '✅' : isActive ? step.icon : '⏳'}</span>
                  <span>STEP {idx + 1}: {step.label}</span>
                  {isActive && (
                    <span className="ml-auto">
                      <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: 'rgb(79,70,229)', borderTopColor: 'transparent' }} />
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1"
              style={result.demoMode
                ? { background: 'rgba(234,179,8,0.08)', color: 'rgb(161,98,7)', border: '1px solid rgba(234,179,8,0.2)' }
                : { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {result.demoMode ? '데모 모드' : 'Hunter Alpha 분석 완료'}
            </span>
            <button
              onClick={handleReset}
              className="text-xs underline transition-colors"
              style={{ color: 'rgba(14,14,14,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.5)')}
            >
              다시 분석
            </button>
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>추천 판매가</p>
              <p className="text-lg font-bold" style={{ color: 'rgb(79,70,229)' }}>
                {result.recommendedPrice.toLocaleString()}원
              </p>
            </div>
            <div className="p-3 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>권장 초기 재고</p>
              <p className="text-lg font-bold" style={{ color: '#0E0E0E' }}>
                {result.recommendedStock}개
              </p>
            </div>
            <div className="p-3 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>재주문 임계값</p>
              <p className="text-lg font-bold" style={{ color: 'rgb(194,65,12)' }}>
                {result.lowStockThreshold}개
              </p>
            </div>
          </div>

          {/* Demand Score */}
          <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <DemandScoreBar score={result.demandScore} />
          </div>

          {/* Descriptions */}
          <div className="p-4 space-y-3" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>
                한 줄 설명
              </p>
              <p className="text-sm font-medium" style={{ color: '#0E0E0E' }}>{result.shortDescription}</p>
            </div>
            <hr style={{ borderColor: 'rgba(14,14,14,0.07)' }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>
                상세 설명
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(14,14,14,0.7)' }}>{result.fullDescription}</p>
            </div>
            <hr style={{ borderColor: 'rgba(14,14,14,0.07)' }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(14,14,14,0.5)' }}>
                핵심 판매 포인트
              </p>
              <p className="text-sm font-medium" style={{ color: 'rgb(67,56,202)' }}>{result.sellingPoint}</p>
            </div>
          </div>

          {/* Price Strategy */}
          {result.priceStrategy && (
            <div className="p-4" style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgb(161,98,7)' }}>
                가격 전략
              </p>
              <p className="text-sm" style={{ color: 'rgb(120,73,5)' }}>{result.priceStrategy}</p>
            </div>
          )}

          {/* Market Insight */}
          {result.marketInsight && (
            <div className="p-4" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgb(4,120,87)' }}>
                시장 진입 인사이트
              </p>
              <p className="text-sm" style={{ color: 'rgb(6,95,70)' }}>{result.marketInsight}</p>
            </div>
          )}

          {/* SEO Tags */}
          {result.seoTags && result.seoTags.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(14,14,14,0.5)' }}>
                SEO 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.seoTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-block text-xs px-2.5 py-1 font-medium"
                    style={{ background: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.6)', border: '1px solid rgba(14,14,14,0.1)' }}
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
              <summary
                className="cursor-pointer text-xs select-none list-none flex items-center gap-1 transition-colors"
                style={{ color: 'rgba(14,14,14,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.4)')}
              >
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                에이전트 실행 로그 보기
              </summary>
              <div className="mt-2 p-3" style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.08)' }}>
                <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(14,14,14,0.5)' }}>
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
