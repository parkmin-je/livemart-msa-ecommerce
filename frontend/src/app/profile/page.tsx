'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  phoneNumber: string;
  role: string;
  createdAt: string;
}

interface OrderStats {
  total: number;
  pending: number;
  delivered: number;
  cancelled: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, delivered: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'settings'>('info');

  const userId = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('userId') || '1') : 1;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/users/${userId}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/orders/user/${userId}?page=0&size=5`).then(r => r.json()).catch(() => ({ content: [] })),
    ]).then(([userData, orderData]) => {
      setUser(userData);
      const orderList = orderData?.content || [];
      setOrders(orderList);
      setStats({
        total: orderList.length,
        pending: orderList.filter((o: any) => o.status === 'PENDING').length,
        delivered: orderList.filter((o: any) => o.status === 'DELIVERED').length,
        cancelled: orderList.filter((o: any) => o.status === 'CANCELLED').length,
      });
      setLoading(false);
    });
  }, [userId]);

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
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">총 주문</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-gray-500">처리 중</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-xs text-gray-500">배송 완료</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-xs text-gray-500">취소</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-6">
            {[
              { key: 'info', label: '내 정보' },
              { key: 'orders', label: '최근 주문' },
              { key: 'settings', label: '설정' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">회원 정보</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm text-gray-500">이름</dt>
                <dd className="text-lg font-medium mt-1">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">이메일</dt>
                <dd className="text-lg font-medium mt-1">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">전화번호</dt>
                <dd className="text-lg font-medium mt-1">{user?.phoneNumber || '미등록'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">등급</dt>
                <dd className="text-lg font-medium mt-1">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {user?.role === 'ADMIN' ? '관리자' : '일반 회원'}
                  </span>
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex gap-3">
              <a href="/wishlist" className="px-4 py-2 bg-pink-50 text-pink-700 rounded-lg text-sm hover:bg-pink-100 transition">
                위시리스트
              </a>
              <a href="/seller" className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition">
                판매자 대시보드
              </a>
              <a href="/notifications" className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition">
                알림
              </a>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length > 0 ? orders.map((order: any) => (
              <div
                key={order.id}
                className="bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{order.orderNumber}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')} | {order.items?.length || 0}개 상품
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <div className="text-lg font-bold text-blue-600 mt-1">
                      ₩{order.totalAmount?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-500">
                주문 내역이 없습니다.
              </div>
            )}
            {orders.length > 0 && (
              <button
                onClick={() => router.push('/my-orders')}
                className="w-full text-center text-blue-600 text-sm hover:underline py-3"
              >
                전체 주문 내역 보기
              </button>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">설정</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="font-medium">알림 설정</div>
                  <div className="text-sm text-gray-500">주문/배송 알림 수신</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="font-medium">마케팅 수신</div>
                  <div className="text-sm text-gray-500">할인/이벤트 정보 수신</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
              <div className="pt-4">
                <button className="px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition">
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
