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

const REASON_OPTIONS = [
  { value: 'CHANGED_MIND',       label: '단순 변심' },
  { value: 'DEFECTIVE',          label: '상품 불량/하자' },
  { value: 'WRONG_ITEM',         label: '오배송' },
  { value: 'NOT_AS_DESCRIBED',   label: '상품 설명과 다름' },
  { value: 'SIZE_ISSUE',         label: '사이즈 문제' },
  { value: 'LATE_DELIVERY',      label: '배송 지연' },
  { value: 'OTHER',              label: '기타' },
];

type ReturnStatusStyle = { label: string; bg: string; color: string; border: string };
const RETURN_STATUS: Record<string, ReturnStatusStyle> = {
  REQUESTED:  { label: '신청 완료',   bg: 'rgba(59,130,246,0.08)',  color: 'rgb(37,99,235)',  border: 'rgba(59,130,246,0.3)' },
  APPROVED:   { label: '승인됨',      bg: 'rgba(34,197,94,0.08)',   color: 'rgb(21,128,61)',  border: 'rgba(34,197,94,0.3)' },
  REJECTED:   { label: '반려됨',      bg: 'rgba(232,0,29,0.07)',    color: '#E8001D',         border: 'rgba(232,0,29,0.3)' },
  IN_TRANSIT: { label: '반품 배송중', bg: 'rgba(168,85,247,0.08)', color: 'rgb(126,34,206)', border: 'rgba(168,85,247,0.3)' },
  RECEIVED:   { label: '수령 완료',   bg: 'rgba(59,130,246,0.08)',  color: 'rgb(37,99,235)',  border: 'rgba(59,130,246,0.3)' },
  COMPLETED:  { label: '반품 완료',   bg: 'rgba(14,14,14,0.06)',    color: 'rgba(14,14,14,0.45)', border: 'rgba(14,14,14,0.1)' },
  CANCELLED:  { label: '취소됨',      bg: 'rgba(14,14,14,0.06)',    color: 'rgba(14,14,14,0.45)', border: 'rgba(14,14,14,0.1)' },
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
    returnType: 'RETURN',
    reason: REASON_OPTIONS[0].value,
    detail: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<Array<{ id: number; orderNumber?: string; status: string; totalAmount: number; createdAt: string; items?: Array<{ productName: string }> }>>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchReturns = (uid: string) => {
    return fetch(`/api/returns/user/${uid}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setReturns(d.content || d || []))
      .catch(() => {});
  };

  const fetchMyOrders = (uid: string) => {
    setOrdersLoading(true);
    fetch(`/api/orders/user/${uid}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const list = d.content || d || [];
        const eligible = list.filter((o: { status: string }) =>
          ['DELIVERED', 'PAYMENT_COMPLETED', 'CONFIRMED', 'SHIPPED'].includes(o.status)
        );
        setMyOrders(eligible);
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
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
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#0E0E0E' }}>반품/교환</h1>

        {/* Tabs */}
        <div className="flex mb-6" style={{ borderBottom: '1px solid rgba(14,14,14,0.1)' }}>
          {[{ id: 'list', label: '신청 내역' }, { id: 'new', label: '반품/교환 신청' }].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as 'list' | 'new');
                if (t.id === 'new' && userId && myOrders.length === 0) fetchMyOrders(userId);
              }}
              className="px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors"
              style={{
                borderBottomColor: tab === t.id ? '#E8001D' : 'transparent',
                color: tab === t.id ? '#E8001D' : 'rgba(14,14,14,0.5)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'new' && myOrders.length === 0 && !ordersLoading && userId && (
          <div
            className="p-4 mb-4 flex items-start gap-3 cursor-pointer transition-colors"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
            onClick={() => fetchMyOrders(userId)}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.06)')}
          >
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(37,99,235)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgb(29,78,216)' }}>주문 번호를 모르시나요?</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(37,99,235)' }}>클릭하면 내 주문 목록에서 선택할 수 있습니다.</p>
            </div>
          </div>
        )}

        {tab === 'new' && ordersLoading && (
          <div className="p-4 mb-4 flex items-center gap-2" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <div className="w-4 h-4 border-2 border-t-red-600 rounded-full animate-spin" style={{ borderColor: 'rgba(14,14,14,0.15)', borderTopColor: '#E8001D' }} />
            <span className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>주문 목록 불러오는 중...</span>
          </div>
        )}

        {tab === 'new' && myOrders.length > 0 && (
          <div className="p-4 mb-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(14,14,14,0.6)' }}>반품/교환 가능한 주문 선택</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {myOrders.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, orderId: String(o.id) }))}
                  className="w-full text-left p-3 transition-colors"
                  style={{
                    border: form.orderId === String(o.id) ? '2px solid #E8001D' : '1px solid rgba(14,14,14,0.12)',
                    background: form.orderId === String(o.id) ? 'rgba(232,0,29,0.05)' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold" style={{ color: '#0E0E0E' }}>
                        {o.orderNumber || `주문 #${o.id}`}
                      </span>
                      {o.items && o.items[0] && (
                        <span className="text-xs ml-2" style={{ color: 'rgba(14,14,14,0.5)' }}>{o.items[0].productName}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#0E0E0E' }}>{o.totalAmount.toLocaleString()}원</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(14,14,14,0.4)' }}>
                    {new Date(o.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'list' ? (
          loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-24 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }} />)}
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-20" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <h2 className="text-base font-bold mb-2" style={{ color: '#0E0E0E' }}>신청 내역이 없습니다</h2>
              <button
                onClick={() => setTab('new')}
                className="mt-4 px-5 py-2 text-white text-sm font-semibold transition-colors"
                style={{ background: '#E8001D' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#C8001A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}
              >
                반품/교환 신청하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {returns.map(r => {
                const st = RETURN_STATUS[r.status] || { label: r.status, bg: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.45)', border: 'rgba(14,14,14,0.1)' };
                return (
                  <div key={r.id} className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold" style={{ color: '#0E0E0E' }}>
                          {r.returnNumber || `주문 #${r.orderId}`}
                        </span>
                        {r.orderNumber && (
                          <span className="ml-2 text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>{r.orderNumber}</span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(14,14,14,0.7)' }}>{REASON_LABEL[r.reason] || r.reason}</p>
                    {r.reasonDetail && <p className="text-xs mt-1" style={{ color: 'rgba(14,14,14,0.5)' }}>{r.reasonDetail}</p>}
                    {r.refundAmount && (
                      <p className="text-sm font-bold mt-2" style={{ color: '#E8001D' }}>환불 예정: {Number(r.refundAmount).toLocaleString()}원</p>
                    )}
                    <p className="text-xs mt-2" style={{ color: 'rgba(14,14,14,0.4)' }}>
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
            <div className="p-4" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(161,98,7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm" style={{ color: 'rgb(133,77,14)' }}>배송 완료 후 7일 이내에만 반품/교환 신청이 가능합니다</p>
              </div>
            </div>

            {/* 반품 정책 요약 */}
            <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: '#0E0E0E' }}>반품/교환 정책</h3>
              <div className="space-y-2 text-xs" style={{ color: 'rgba(14,14,14,0.6)' }}>
                {[
                  '상품 수령 후 7일 이내 신청 가능',
                  '단순 변심 반품 시 왕복 배송비 고객 부담',
                  '상품 하자/오배송 시 배송비 판매자 부담',
                  '환불은 반품 확인 후 3-5 영업일 이내 처리',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(14,14,14,0.35)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={submitReturn} className="p-5 space-y-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <h2 className="font-bold text-sm" style={{ color: '#0E0E0E' }}>반품/교환 신청</h2>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(14,14,14,0.6)' }}>
                  주문 번호 *
                  {myOrders.length === 0 && (
                    <button
                      type="button"
                      onClick={() => userId && fetchMyOrders(userId)}
                      className="ml-2 underline text-xs font-normal"
                      style={{ color: '#E8001D' }}
                    >
                      주문 목록에서 선택
                    </button>
                  )}
                </label>
                {form.orderId && myOrders.find(o => String(o.id) === form.orderId) ? (
                  <div className="flex items-center justify-between px-3 py-2" style={{ border: '2px solid #E8001D', background: 'rgba(232,0,29,0.04)' }}>
                    <span className="text-sm font-semibold" style={{ color: '#E8001D' }}>
                      {myOrders.find(o => String(o.id) === form.orderId)?.orderNumber || `주문 #${form.orderId}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, orderId: '' }))}
                      className="text-xs transition-colors"
                      style={{ color: 'rgba(14,14,14,0.45)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.45)')}
                    >
                      변경
                    </button>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={form.orderId}
                    onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                    placeholder="주문 번호 입력 (예: 123)"
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E' }}
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(14,14,14,0.6)' }}>신청 유형 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {RETURN_TYPES.map(t => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, returnType: t.v }))}
                      className="py-2.5 text-sm font-semibold transition-colors"
                      style={{
                        border: form.returnType === t.v ? '2px solid #E8001D' : '1px solid rgba(14,14,14,0.14)',
                        background: form.returnType === t.v ? 'rgba(232,0,29,0.05)' : 'transparent',
                        color: form.returnType === t.v ? '#E8001D' : 'rgba(14,14,14,0.65)',
                      }}
                    >
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(14,14,14,0.6)' }}>반품/교환 사유 *</label>
                <select
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
                >
                  {REASON_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(14,14,14,0.6)' }}>상세 내용</label>
                <textarea
                  value={form.detail}
                  onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                  placeholder="상세한 사유를 입력해주세요"
                  rows={4}
                  className="w-full px-3 py-2 text-sm focus:outline-none resize-none"
                  style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !userId}
                className="w-full py-3 text-white text-sm font-bold transition-colors disabled:opacity-60"
                style={{ background: '#E8001D' }}
                onMouseEnter={e => !submitting && userId && (e.currentTarget.style.background = '#C8001A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}
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
