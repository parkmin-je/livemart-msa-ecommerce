'use client';

import { useState, useEffect } from 'react';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

interface ReturnItem {
  id: number;
  orderId: number;
  status: string;
  reason: string;
  createdAt: string;
}

const REASONS = [
  '단순 변심', '상품 불량/하자', '오배송', '상품 미도착', '상품 정보 상이', '기타',
];

const RETURN_STATUS: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: '신청 완료', color: 'badge-blue' },
  APPROVED: { label: '승인됨', color: 'badge-green' },
  REJECTED: { label: '반려됨', color: 'badge-red' },
  COMPLETED: { label: '반품 완료', color: 'badge-gray' },
};

export default function ReturnsPage() {
  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ orderId: '', reason: REASONS[0], detail: '' });
  const [submitting, setSubmitting] = useState(false);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/returns?userId=${userId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setReturns(d.content || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId) { toast.error('주문 번호를 입력하세요'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: Number(form.orderId), reason: `${form.reason}: ${form.detail}`, userId: Number(userId) }),
      });
      if (!res.ok) throw new Error('신청 실패');
      toast.success('반품/교환 신청이 완료되었습니다');
      setTab('list');
      setForm({ orderId: '', reason: REASONS[0], detail: '' });
      // 목록 새로고침
      const d = await fetch(`/api/returns?userId=${userId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
      setReturns(d.content || d || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '오류 발생');
    }
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">반품/교환</h1>

        {/* 탭 */}
        <div className="flex gap-2 mb-5">
          {[{ id: 'list', label: '신청 내역' }, { id: 'new', label: '반품/교환 신청' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as 'list' | 'new')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-colors ${tab === t.id ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'list' ? (
          loading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100"/>)}</div>
          ) : returns.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-4">↩️</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">신청 내역이 없습니다</h2>
              <button onClick={() => setTab('new')} className="btn-primary px-5 mt-4">반품/교환 신청하기</button>
            </div>
          ) : (
            <div className="space-y-3">
              {returns.map(r => {
                const st = RETURN_STATUS[r.status] || { label: r.status, color: 'badge-gray' };
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">주문 #{r.orderId}</span>
                      <span className={`${st.color} text-xs`}>{st.label}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{r.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">신청일: {new Date(r.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <form onSubmit={submitReturn} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">반품/교환 신청</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              ⚠️ 배송 완료 후 7일 이내에만 신청 가능합니다
            </div>
            <div>
              <label className="form-label">주문 번호 *</label>
              <input type="number" value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                placeholder="주문 번호를 입력하세요 (예: 123)" className="form-input" required />
            </div>
            <div>
              <label className="form-label">반품/교환 사유 *</label>
              <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="form-input">
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">상세 내용</label>
              <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                placeholder="상세한 사유를 입력해주세요" rows={4} className="form-input resize-none" />
            </div>
            <button type="submit" disabled={submitting || !userId} className="w-full btn-primary py-3 font-bold disabled:opacity-60">
              {!userId ? '로그인이 필요합니다' : submitting ? '신청중...' : '반품/교환 신청'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
