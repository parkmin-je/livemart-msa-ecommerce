'use client';

import { useState, useEffect } from 'react';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

interface ReturnItem {
  id: number;
  returnNumber?: string;
  orderId: number;
  orderNumber?: string;
  status: string;
  reason: string;
  reasonDetail?: string;
  refundAmount?: number;
  requestedAt: string;
}

// 백엔드 enum 값에 맞춘 사유 목록
const REASON_OPTIONS = [
  { value: 'CHANGED_MIND',       label: '단순 변심' },
  { value: 'DEFECTIVE',          label: '상품 불량/하자' },
  { value: 'WRONG_ITEM',         label: '오배송' },
  { value: 'NOT_AS_DESCRIBED',   label: '상품 설명과 다름' },
  { value: 'SIZE_ISSUE',         label: '사이즈 문제' },
  { value: 'LATE_DELIVERY',      label: '배송 지연' },
  { value: 'OTHER',              label: '기타' },
];

const RETURN_STATUS: Record<string, { label: string; style: string }> = {
  REQUESTED:  { label: '신청 완료',   style: 'bg-blue-50 text-blue-700 border border-blue-200' },
  APPROVED:   { label: '승인됨',      style: 'bg-green-50 text-green-700 border border-green-200' },
  REJECTED:   { label: '반려됨',      style: 'bg-red-50 text-red-700 border border-red-200' },
  IN_TRANSIT: { label: '반품 배송중', style: 'bg-purple-50 text-purple-700 border border-purple-200' },
  RECEIVED:   { label: '수령 완료',   style: 'bg-blue-50 text-blue-700 border border-blue-200' },
  COMPLETED:  { label: '반품 완료',   style: 'bg-gray-100 text-gray-500 border border-gray-200' },
  CANCELLED:  { label: '취소됨',      style: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REASON_OPTIONS.map(r => [r.value, r.label])
);

export default function ReturnsPage() {
  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    orderId: '',
    returnType: 'RETURN',   // RETURN | EXCHANGE | REFUND
    reason: REASON_OPTIONS[0].value,
    detail: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  const fetchReturns = (uid: string) => {
    return fetch(`/api/returns/user/${uid}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setReturns(d.content || d || []))
      .catch(() => {});
  };

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    fetchReturns(uid).finally(() => setLoading(false));
  }, []);

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId) { toast.error('주문 번호를 입력하세요'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: Number(form.orderId),
          returnType: form.returnType,
          reason: form.reason,
          reasonDetail: form.detail || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.detail || '신청 실패');
      }
      toast.success('반품/교환 신청이 완료되었습니다');
      setTab('list');
      setForm({ orderId: '', returnType: 'RETURN', reason: REASON_OPTIONS[0].value, detail: '' });
      if (userId) fetchReturns(userId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '오류 발생');
    }
    setSubmitting(false);
  };

  const RETURN_TYPES = [
    { v: 'RETURN', l: '반품' },
    { v: 'EXCHANGE', l: '교환' },
    { v: 'REFUND', l: '환불만' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">반품/교환</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[{ id: 'list', label: '신청 내역' }, { id: 'new', label: '반품/교환 신청' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'list' | 'new')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'list' ? (
          loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="bg-white border border-gray-200 h-24 animate-pulse"/>)}
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-200">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <h2 className="text-base font-bold text-gray-900 mb-2">신청 내역이 없습니다</h2>
              <button
                onClick={() => setTab('new')}
                className="mt-4 px-5 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                반품/교환 신청하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {returns.map(r => {
                const st = RETURN_STATUS[r.status] || { label: r.status, style: 'bg-gray-100 text-gray-500 border border-gray-200' };
                return (
                  <div key={r.id} className="bg-white border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          {r.returnNumber || `주문 #${r.orderId}`}
                        </span>
                        {r.orderNumber && (
                          <span className="ml-2 text-xs text-gray-400">{r.orderNumber}</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 ${st.style}`}>{st.label}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{REASON_LABEL[r.reason] || r.reason}</p>
                    {r.reasonDetail && <p className="text-xs text-gray-500 mt-1">{r.reasonDetail}</p>}
                    {r.refundAmount && (
                      <p className="text-sm text-red-600 font-bold mt-2">환불 예정: {Number(r.refundAmount).toLocaleString()}원</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      신청일: {new Date(r.requestedAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {/* 정책 안내 */}
            <div className="bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-700">배송 완료 후 7일 이내에만 반품/교환 신청이 가능합니다</p>
              </div>
            </div>

            {/* 반품 정책 요약 */}
            <div className="bg-white border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">반품/교환 정책</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>상품 수령 후 7일 이내 신청 가능</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>단순 변심 반품 시 왕복 배송비 고객 부담</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>상품 하자/오배송 시 배송비 판매자 부담</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>환불은 반품 확인 후 3-5 영업일 이내 처리</span>
                </div>
              </div>
            </div>

            <form onSubmit={submitReturn} className="bg-white border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900 text-sm">반품/교환 신청</h2>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">주문 번호 *</label>
                <input
                  type="number"
                  value={form.orderId}
                  onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                  placeholder="주문 번호 입력 (예: 123)"
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">신청 유형 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {RETURN_TYPES.map(t => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, returnType: t.v }))}
                      className={`py-2.5 border-2 text-sm font-semibold transition-colors ${
                        form.returnType === t.v
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">반품/교환 사유 *</label>
                <select
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
                >
                  {REASON_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">상세 내용</label>
                <textarea
                  value={form.detail}
                  onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                  placeholder="상세한 사유를 입력해주세요"
                  rows={4}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !userId}
                className="w-full py-3 bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {!userId ? '로그인이 필요합니다' : submitting ? '신청중...' : '반품/교환 신청'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
