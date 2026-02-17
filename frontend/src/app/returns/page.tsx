'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { returnApi } from '@/api/productApi';
import toast from 'react-hot-toast';

interface ReturnItem {
  id: number;
  returnNumber: string;
  orderId: number;
  orderNumber: string;
  userId: number;
  reason: string;
  type: string;
  status: string;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: '요청됨', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: '승인됨', color: 'bg-blue-100 text-blue-800' },
  REJECTED: { label: '거절됨', color: 'bg-red-100 text-red-800' },
  PROCESSING: { label: '처리 중', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: '완료', color: 'bg-green-100 text-green-800' },
};

const TYPE_MAP: Record<string, string> = {
  RETURN: '반품',
  REFUND: '환불',
  EXCHANGE: '교환',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('orderId');

  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!orderIdParam);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    orderId: orderIdParam ? Number(orderIdParam) : 0,
    reason: '',
    type: 'RETURN',
  });

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      const data = await returnApi.getUserReturns(1);
      setReturns(data.content || []);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderId || !form.reason.trim()) {
      toast.error('주문 ID와 사유를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await returnApi.createReturn({
        orderId: form.orderId,
        userId: 1,
        reason: form.reason,
        type: form.type,
      });
      toast.success('반품/환불 요청이 접수되었습니다.');
      setShowForm(false);
      setForm({ orderId: 0, reason: '', type: 'RETURN' });
      loadReturns();
    } catch {
      toast.error('요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">상품</a>
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
              <a href="/profile" className="text-sm text-gray-700 hover:text-blue-600">마이페이지</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">반품/환불 관리</h1>
            <p className="text-gray-500 mt-1">반품, 환불, 교환 요청을 관리합니다</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            {showForm ? '취소' : '새 요청'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm mb-8 space-y-4">
            <h2 className="text-lg font-bold">반품/환불 요청</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주문 ID *</label>
                <input
                  type="number"
                  value={form.orderId || ''}
                  onChange={(e) => setForm({ ...form, orderId: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="주문 ID 입력"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">요청 유형 *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="RETURN">반품</option>
                  <option value="REFUND">환불</option>
                  <option value="EXCHANGE">교환</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사유 *</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                rows={3}
                required
                placeholder="반품/환불 사유를 상세히 입력해주세요"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition"
            >
              {submitting ? '처리 중...' : '요청 접수'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-700">반품/환불 내역이 없습니다</h3>
            <p className="text-gray-500 mt-1">주문 상세에서 반품/환불을 요청할 수 있습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-gray-500">#{item.returnNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[item.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_MAP[item.status]?.label || item.status}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {TYPE_MAP[item.type] || item.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">요청일: {formatDate(item.createdAt)}</p>
                  </div>
                  {item.refundAmount > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">환불 금액</div>
                      <div className="text-lg font-bold text-blue-600">₩{item.refundAmount?.toLocaleString()}</div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">사유</div>
                  <div className="text-gray-700">{item.reason}</div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => router.push(`/orders/${item.orderId}`)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    주문 상세 보기
                  </button>
                  {item.completedAt && (
                    <span className="text-sm text-green-600">완료: {formatDate(item.completedAt)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
