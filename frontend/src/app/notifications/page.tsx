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

function NotificationTypeIcon({ type }: { type: string }) {
  const cls = "w-5 h-5";
  switch (type) {
    case 'ORDER':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'PAYMENT':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'DELIVERY':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      );
    case 'PROMOTION':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      );
    case 'SYSTEM':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'REVIEW':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case 'RETURN':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid);
    if (!uid) { setLoading(false); return; }

    // 기존 알림 조회
    fetch(`/api/notifications/user/${uid}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setNotifications(d.content || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    // SSE 실시간 알림 연결
    const es = new EventSource(`/api/notifications/stream/${uid}`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const TYPE_COLOR: Record<string, string> = {
    ORDER: 'bg-blue-50 text-blue-600',
    PAYMENT: 'bg-green-50 text-green-600',
    DELIVERY: 'bg-purple-50 text-purple-600',
    PROMOTION: 'bg-red-50 text-red-600',
    SYSTEM: 'bg-gray-100 text-gray-600',
    REVIEW: 'bg-yellow-50 text-yellow-600',
    RETURN: 'bg-orange-50 text-orange-600',
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">알림 센터</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-500">{connected ? '실시간 연결됨' : '연결 끊김'}</span>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 px-4 py-2 transition-colors"
            >
              모두 읽음 처리 ({unreadCount})
            </button>
          )}
        </div>

        {!userId ? (
          <div className="text-center py-20 bg-white border border-gray-200">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-base font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <a href="/auth" className="inline-block mt-4 px-5 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
              로그인
            </a>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="bg-white border border-gray-200 h-20 animate-pulse"/>)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="text-base font-bold text-gray-900 mb-2">알림이 없습니다</h2>
            <p className="text-gray-500 text-sm">주문, 배송 등 중요한 알림을 여기서 확인하세요</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`bg-white border p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !n.read ? 'border-l-4 border-l-red-600 border-t-gray-200 border-r-gray-200 border-b-gray-200' : 'border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center ${TYPE_COLOR[n.type] || 'bg-gray-100 text-gray-500'}`}>
                  <NotificationTypeIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className={`text-sm font-semibold ${n.read ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
