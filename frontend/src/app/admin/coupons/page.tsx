'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Coupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  expiresAt?: string;
  active: boolean;
  usageCount?: number;
  maxUsage?: number;
}

interface CouponForm {
  code: string;
  discountType: string;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  expiresAt: string;
  maxUsage: string;
}

const emptyForm: CouponForm = {
  code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderAmount: '', maxDiscountAmount: '', expiresAt: '', maxUsage: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE}/api/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCoupons(Array.isArray(data) ? data : data.content || []);
      }
    } catch {
      setCoupons([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LM-';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm({ ...form, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.discountValue) {
      toast.error('필수 항목을 입력해주세요.');
      return;
    }
    setFormLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const body = {
        code: form.code,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined,
        expiresAt: form.expiresAt || undefined,
        maxUsage: form.maxUsage ? parseInt(form.maxUsage) : undefined,
      };
      const res = await fetch(`${API_BASE}/api/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('쿠폰이 생성되었습니다.');
        setShowForm(false);
        setForm(emptyForm);
        fetchCoupons();
      } else {
        toast.error('쿠폰 생성에 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (couponId: number, active: boolean) => {
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_BASE}/api/coupons/${couponId}/${active ? 'deactivate' : 'activate'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(active ? '쿠폰이 비활성화되었습니다.' : '쿠폰이 활성화되었습니다.');
      fetchCoupons();
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  const handleDelete = async (couponId: number) => {
    if (!confirm('이 쿠폰을 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_BASE}/api/coupons/${couponId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('쿠폰이 삭제되었습니다.');
      fetchCoupons();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/admin" className="text-sm text-gray-700 hover:text-blue-600">관리자</a>
              <a href="/admin/orders" className="text-sm text-gray-700 hover:text-blue-600">주문</a>
              <a href="/admin/users" className="text-sm text-gray-700 hover:text-blue-600">유저</a>
              <span className="text-sm font-medium text-blue-600">쿠폰</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">쿠폰 관리</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            {showForm ? '닫기' : '+ 새 쿠폰 생성'}
          </button>
        </div>

        {/* Coupon Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">새 쿠폰 생성</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰 코드 *</label>
                <div className="flex gap-2">
                  <input type="text" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" placeholder="LM-XXXXXXXX" />
                  <button type="button" onClick={generateCode} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">자동생성</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">할인 유형</label>
                <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="PERCENTAGE">퍼센트 (%)</option>
                  <option value="FIXED">고정 금액 (원)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  할인 값 * {form.discountType === 'PERCENTAGE' ? '(%)' : '(원)'}
                </label>
                <input type="number" required min="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">최소 주문 금액 (원)</label>
                <input type="number" min="0" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="10000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">최대 할인 금액 (원)</label>
                <input type="number" min="0" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">만료일</label>
                <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">최대 사용 횟수</label>
                <input type="number" min="1" value={form.maxUsage} onChange={(e) => setForm({ ...form, maxUsage: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="100" />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={formLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">
                  {formLoading ? '생성 중...' : '쿠폰 생성'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition">취소</button>
              </div>
            </form>
          </div>
        )}

        {/* Coupon List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center text-gray-500">등록된 쿠폰이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">할인</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">최소 주문</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">만료일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-blue-600">{coupon.code}</span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}%`
                        : `${coupon.discountValue?.toLocaleString()}원`
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {coupon.minOrderAmount ? `${coupon.minOrderAmount.toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {coupon.usageCount || 0}{coupon.maxUsage ? ` / ${coupon.maxUsage}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('ko-KR') : '무제한'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {coupon.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleToggle(coupon.id, coupon.active)} className={`px-2 py-1 rounded text-xs ${coupon.active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {coupon.active ? '비활성화' : '활성화'}
                        </button>
                        <button onClick={() => handleDelete(coupon.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
