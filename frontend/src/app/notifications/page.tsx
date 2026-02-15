'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Notification {
  id: string;
  userId: number;
  type: string;
  title: string;
  message: string;
  referenceId: string;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  ORDER_CREATED: '📋',
  ORDER_CONFIRMED: '💳',
  ORDER_SHIPPED: '🚚',
  ORDER_DELIVERED: '📦',
  ORDER_CANCELLED: '❌',
  PAYMENT_COMPLETED: '✅',
  PAYMENT_FAILED: '⚠️',
  STOCK_LOW: '📉',
};

const typeLabels: Record<string, string> = {
  ORDER_CREATED: '주문 접수',
  ORDER_CONFIRMED: '결제 완료',
  ORDER_SHIPPED: '배송 시작',
  ORDER_DELIVERED: '배송 완료',
  ORDER_CANCELLED: '주문 취소',
  PAYMENT_COMPLETED: '결제 완료',
  PAYMENT_FAILED: '결제 실패',
  STOCK_LOW: '재고 부족',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const userId = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('userId') || '1') : 1;

  useEffect(() => {
    fetch(`${API_BASE}/api/notifications/user/${userId}`)
      .then(r => r.json())
      .then(data => { setNotifications(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type.startsWith(filter));

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (notification: Notification) => {
    if (notification.referenceId && notification.type.startsWith('ORDER')) {
      router.push(`/my-orders`);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
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
              <a href="/profile" className="text-sm text-gray-700 hover:text-blue-600">마이페이지</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">알림</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">읽지 않은 알림 {unreadCount}개</p>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: '전체' },
            { key: 'unread', label: '읽지 않음' },
            { key: 'ORDER', label: '주문' },
            { key: 'PAYMENT', label: '결제' },
            { key: 'STOCK', label: '재고' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition ${
                  !notification.read ? 'border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">
                    {typeIcons[notification.type] || '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {typeLabels[notification.type] || notification.type}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{notification.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                    <div className="text-xs text-gray-400 mt-2">{formatTime(notification.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-16 shadow-sm text-center">
            <div className="text-6xl mb-4">🔔</div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">알림이 없습니다</h2>
            <p className="text-gray-500">주문이나 배송 관련 알림이 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
