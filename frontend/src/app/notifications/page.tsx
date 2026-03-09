'use client';

import { useState, useEffect, useRef } from 'react';
import { GlobalNav } from '@/components/GlobalNav';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  ORDER: '📦', PAYMENT: '💳', DELIVERY: '🚚', PROMOTION: '🎁', SYSTEM: '⚙️', REVIEW: '⭐', RETURN: '↩️',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    // 기존 알림 조회
    fetch(`/api/notifications/user/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setNotifications(d.content || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    // SSE 실시간 알림 연결
    const es = new EventSource(`/api/notifications/stream/${userId}`);
    eventSourceRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const n = JSON.parse(e.data);
        setNotifications(prev => [n, ...prev]);
      } catch {}
    };
    es.onerror = () => setConnected(false);

    return () => { es.close(); setConnected(false); };
  }, [userId]);

  const markRead = async (id: number) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT', credentials: 'include',
      });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    try {
      await fetch(`/api/notifications/user/${userId}/read-all`, {
        method: 'PUT', credentials: 'include',
      });
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <main className="min-h-screen bg-gray-100 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">알림 센터</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-500">{connected ? '실시간 연결됨' : '연결 끊김'}</span>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-sm text-red-600 hover:underline font-medium">
              모두 읽음 처리 ({unreadCount})
            </button>
          )}
        </div>

        {!userId ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <a href="/auth" className="btn-primary px-5 mt-4 inline-block">로그인</a>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-gray-100"/>)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-4">🔔</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">알림이 없습니다</h2>
            <p className="text-gray-500 text-sm">주문, 배송 등 중요한 알림을 여기서 확인하세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 cursor-pointer hover:shadow-sm transition-shadow ${!n.read ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className={`text-sm font-semibold ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
