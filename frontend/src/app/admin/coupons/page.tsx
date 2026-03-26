'use client';

import { useState, useEffect } from 'react';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

interface Coupon {
  id: number;
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrderAmount: number;
  expiresAt: string;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', discountType: 'PERCENTAGE', discountValue: '', minimumOrderAmount: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons?page=0&size=50', { credentials: 'include' });
      const data = await res.json();
      setCoupons(data.content || []);
    } catch { setCoupons([]); }
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.discountValue || !form.expiresAt) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await fetch('/api/coupons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, discountValue: Number(form.discountValue), minimumOrderAmount: Number(form.minimumOrderAmount || 0) }),
      });
      toast.success('쿠폰이 생성되었습니다. (데모)');
      setShowForm(false);
      setForm({ code: '', name: '', discountType: 'PERCENTAGE', discountValue: '', minimumOrderAmount: '', expiresAt: '' });
      fetchCoupons();
    } catch { toast.error('쿠폰 생성에 실패했습니다.'); }
    setSaving(false);
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await fetch(`/api/coupons/${id}/toggle`, { method: 'PUT', credentials: 'include' });
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive: !isActive } : c));
      toast.success(isActive ? '쿠폰이 비활성화되었습니다.' : '쿠폰이 활성화되었습니다.');
    } catch { toast.error('처리 실패'); }
  };

  const inputSty: React.CSSProperties = { border: '1px solid rgba(14,14,14,0.14)', background: '#FFFFFF', color: '#0E0E0E' };

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      <div className="text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/admin" className="text-xs font-semibold tracking-widest uppercase transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>쿠폰 관리</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-14 md:pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>쿠폰 관리</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>쿠폰 생성 및 활성화 관리</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className="px-4 py-2 text-sm transition-colors"
              style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.6)', background: '#FFFFFF' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}>관리자 센터</a>
            <button onClick={() => setShowForm(v => !v)}
              className="px-4 py-2 text-sm font-semibold transition-colors"
              style={showForm
                ? { border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.7)', background: '#FFFFFF' }
                : { background: '#0A0A0A', color: '#FFFFFF', border: '1px solid transparent' }}
              onMouseEnter={e => { if (!showForm) e.currentTarget.style.background = '#E8001D'; }}
              onMouseLeave={e => { if (!showForm) e.currentTarget.style.background = '#0A0A0A'; }}>
              {showForm ? '취소' : '+ 쿠폰 생성'}
            </button>
          </div>
        </div>

        {/* 생성 폼 */}
        {showForm && (
          <div className="mb-6 p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#0E0E0E' }}>새 쿠폰 생성</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                { label: '쿠폰 코드 *', key: 'code', placeholder: 'SUMMER20' },
                { label: '쿠폰명 *', key: 'name', placeholder: '여름 시즌 할인' },
                { label: '할인 값 *', key: 'discountValue', placeholder: '10', type: 'number' },
                { label: '최소 주문 금액', key: 'minimumOrderAmount', placeholder: '30000', type: 'number' },
                { label: '만료일 *', key: 'expiresAt', placeholder: '', type: 'date' },
              ] as { label: string; key: string; placeholder: string; type?: string }[]).map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(14,14,14,0.6)' }}>{label}</label>
                  <input
                    type={type || 'text'}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={inputSty}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(14,14,14,0.6)' }}>할인 타입</label>
                <select value={form.discountType} onChange={e => setForm(prev => ({ ...prev, discountType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm focus:outline-none" style={inputSty}>
                  <option value="PERCENTAGE">퍼센트 (%)</option>
                  <option value="FIXED">고정 금액 (원)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleCreate} disabled={saving}
                className="px-6 py-2 text-sm font-semibold text-white transition-colors"
                style={{ background: saving ? 'rgba(14,14,14,0.3)' : '#0A0A0A' }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#E8001D'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#0A0A0A'; }}>
                {saving ? '생성 중...' : '쿠폰 생성'}
              </button>
            </div>
          </div>
        )}

        {/* 쿠폰 목록 */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 rounded-full mx-auto" style={{ border: '2px solid rgba(14,14,14,0.1)', borderTopColor: '#E8001D' }} />
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>등록된 쿠폰이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F7F6F1', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
                  {['코드', '쿠폰명', '할인', '최소 주문', '만료일', '상태', '관리'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(14,14,14,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => (
                  <tr key={coupon.id} style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3">
                      <span className="text-sm font-mono font-bold" style={{ color: '#0E0E0E' }}>{coupon.code}</span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#0E0E0E' }}>{coupon.name}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold" style={{ color: '#E8001D' }}>
                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `${coupon.discountValue.toLocaleString()}원`}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.6)' }}>
                      {coupon.minimumOrderAmount > 0 ? `${coupon.minimumOrderAmount.toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.6)' }}>
                      {new Date(coupon.expiresAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5" style={coupon.isActive
                        ? { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)', border: '1px solid rgba(16,185,129,0.2)' }
                        : { background: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.45)', border: '1px solid rgba(14,14,14,0.12)' }}>
                        {coupon.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleToggle(coupon.id, coupon.isActive)}
                        className="px-2.5 py-1 text-xs transition-colors"
                        style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.6)', background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {coupon.isActive ? '비활성화' : '활성화'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
