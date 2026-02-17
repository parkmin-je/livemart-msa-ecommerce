'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/api/productApi';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  phoneNumber: string;
  role: string;
  createdAt: string;
}

interface OrderSummary {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: { productId: number }[];
}

interface OrderStats {
  total: number;
  pending: number;
  delivered: number;
  cancelled: number;
}

type TabKey = 'info' | 'edit' | 'orders' | 'security' | 'settings';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, delivered: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  // 프로필 수정 상태
  const [editForm, setEditForm] = useState({ name: '', phoneNumber: '' });
  const [editLoading, setEditLoading] = useState(false);

  // 비밀번호 변경 상태
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const userId = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('userId') || '1') : 1;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      }).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/orders/user/${userId}?page=0&size=5`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      }).then(r => r.json()).catch(() => ({ content: [] })),
    ]).then(([userData, orderData]) => {
      setUser(userData);
      if (userData) {
        setEditForm({ name: userData.name || '', phoneNumber: userData.phoneNumber || '' });
      }
      const orderList: OrderSummary[] = orderData?.content || [];
      setOrders(orderList);
      setStats({
        total: orderList.length,
        pending: orderList.filter((o) => o.status === 'PENDING').length,
        delivered: orderList.filter((o) => o.status === 'DELIVERED').length,
        cancelled: orderList.filter((o) => o.status === 'CANCELLED').length,
      });
      setLoading(false);
    });
  }, [userId]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.name.length < 2) {
      toast.error('이름은 2자 이상이어야 합니다.');
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        localStorage.setItem('userName', updated.name);
        toast.success('프로필이 수정되었습니다.');
        setActiveTab('info');
      } else {
        toast.error('프로필 수정에 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) {
      toast.error('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      if (res.ok) {
        toast.success('비밀번호가 변경되었습니다.');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error('현재 비밀번호가 일치하지 않습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    toast.success('로그아웃되었습니다.');
    router.push('/auth');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { cls: string; label: string }> = {
      PENDING: { cls: 'bg-yellow-100 text-yellow-800', label: '대기' },
      CONFIRMED: { cls: 'bg-blue-100 text-blue-800', label: '확인' },
      SHIPPED: { cls: 'bg-purple-100 text-purple-800', label: '배송중' },
      DELIVERED: { cls: 'bg-green-100 text-green-800', label: '완료' },
      CANCELLED: { cls: 'bg-red-100 text-red-800', label: '취소' },
    };
    const c = config[status] || config.PENDING;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>{c.label}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'info', label: '내 정보' },
    { key: 'edit', label: '정보 수정' },
    { key: 'orders', label: '최근 주문' },
    { key: 'security', label: '보안' },
    { key: 'settings', label: '설정' },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">상품</a>
              <a href="/cart" className="text-sm text-gray-700 hover:text-blue-600">장바구니</a>
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name || '사용자'}</h1>
              <p className="opacity-80">{user?.email}</p>
              <p className="text-sm opacity-60 mt-1">
                가입일: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { value: stats.total, label: '총 주문', color: 'text-gray-900' },
            { value: stats.pending, label: '처리 중', color: 'text-yellow-600' },
            { value: stats.delivered, label: '배송 완료', color: 'text-green-600' },
            { value: stats.cancelled, label: '취소', color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 내 정보 */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">회원 정보</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><dt className="text-sm text-gray-500">이름</dt><dd className="text-lg font-medium mt-1">{user?.name}</dd></div>
              <div><dt className="text-sm text-gray-500">이메일</dt><dd className="text-lg font-medium mt-1">{user?.email}</dd></div>
              <div><dt className="text-sm text-gray-500">전화번호</dt><dd className="text-lg font-medium mt-1">{user?.phoneNumber || '미등록'}</dd></div>
              <div><dt className="text-sm text-gray-500">등급</dt><dd className="mt-1"><span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{user?.role === 'ADMIN' ? '관리자' : '일반 회원'}</span></dd></div>
            </dl>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setActiveTab('edit')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">정보 수정</button>
              <a href="/wishlist" className="px-4 py-2 bg-pink-50 text-pink-700 rounded-lg text-sm hover:bg-pink-100 transition">위시리스트</a>
              <a href="/seller" className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition">판매자 대시보드</a>
              <a href="/notifications" className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition">알림</a>
            </div>
          </div>
        )}

        {/* 정보 수정 */}
        {activeTab === 'edit' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">프로필 수정</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input type="email" disabled value={user?.email || ''} className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500" />
                <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={editLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">
                  {editLoading ? '저장 중...' : '저장'}
                </button>
                <button type="button" onClick={() => setActiveTab('info')} className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition">취소</button>
              </div>
            </form>
          </div>
        )}

        {/* 최근 주문 */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length > 0 ? orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition" onClick={() => router.push(`/orders/${order.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{order.orderNumber}</div>
                    <div className="text-sm text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString('ko-KR')} | {order.items?.length || 0}개 상품</div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <div className="text-lg font-bold text-blue-600 mt-1">{order.totalAmount?.toLocaleString()}원</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-500">주문 내역이 없습니다.</div>
            )}
            {orders.length > 0 && (
              <button onClick={() => router.push('/my-orders')} className="w-full text-center text-blue-600 text-sm hover:underline py-3">전체 주문 내역 보기</button>
            )}
          </div>
        )}

        {/* 보안 */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">비밀번호 변경</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
                <input type="password" required value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                <input type="password" required minLength={8} value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" placeholder="8자 이상" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
                <input type="password" required value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" />
              </div>
              <button type="submit" disabled={pwLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">
                {pwLoading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>

            <div className="mt-10 pt-6 border-t">
              <h3 className="text-lg font-bold text-gray-900 mb-4">2단계 인증 (MFA)</h3>
              <p className="text-sm text-gray-600 mb-4">OTP 앱을 사용하여 계정 보안을 강화할 수 있습니다.</p>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/api/v1/mfa/setup`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                    });
                    if (res.ok) {
                      toast.success('MFA 설정이 시작되었습니다. 이메일을 확인해주세요.');
                    } else {
                      toast.error('MFA 설정에 실패했습니다.');
                    }
                  } catch {
                    toast.error('서버 오류가 발생했습니다.');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
              >
                MFA 설정하기
              </button>
            </div>
          </div>
        )}

        {/* 설정 */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">설정</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div><div className="font-medium">알림 설정</div><div className="text-sm text-gray-500">주문/배송 알림 수신</div></div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div><div className="font-medium">마케팅 수신</div><div className="text-sm text-gray-500">할인/이벤트 정보 수신</div></div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={handleLogout} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition">로그아웃</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
