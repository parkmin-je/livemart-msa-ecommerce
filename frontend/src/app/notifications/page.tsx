'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GlobalNav } from '@/components/GlobalNav';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function NotificationTypeIcon({ type }: { type: string }) {
  const cls = "w-5 h-5";
  const t = type?.startsWith('ORDER') ? 'ORDER'
    : type?.startsWith('PAYMENT') ? 'PAYMENT'
    : type?.startsWith('STOCK') ? 'DELIVERY'
    : type;
  switch (t) {
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

function getTypeStyle(type: string): React.CSSProperties {
  if (type?.startsWith('ORDER')) return { background: 'rgba(59,130,246,0.08)', color: 'rgb(37,99,235)' };
  if (type?.startsWith('PAYMENT')) return { background: 'rgba(34,197,94,0.08)', color: 'rgb(21,128,61)' };
  if (type?.startsWith('STOCK') || type === 'DELIVERY') return { background: 'rgba(168,85,247,0.08)', color: 'rgb(126,34,206)' };
  if (type === 'PROMOTION') return { background: 'rgba(232,0,29,0.07)', color: '#E8001D' };
  if (type === 'SYSTEM') return { background: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.55)' };
  if (type === 'REVIEW') return { background: 'rgba(234,179,8,0.08)', color: 'rgb(161,98,7)' };
  if (type === 'RETURN') return { background: 'rgba(249,115,22,0.08)', color: 'rgb(194,65,12)' };
  return { background: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.45)' };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const connectSSE = useCallback((uid: string) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(`/api/notifications/stream/${uid}`, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setReconnecting(false);
      retryCountRef.current = 0;
    };

    es.onmessage = (e) => {
      try {
        const n = JSON.parse(e.data);
        if (n && n.id) {
          setNotifications(prev => {
            if (prev.some(p => p.id === n.id)) return prev;
            return [n, ...prev];
          });
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);

      const count = retryCountRef.current;
      if (count < 8) {
        retryCountRef.current++;
        setReconnecting(true);
        const delay = Math.min(2000 * Math.pow(1.5, count), 60000);
        retryTimerRef.current = setTimeout(() => connectSSE(uid), delay);
      } else {
        setReconnecting(false);
      }
    };
  }, []);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid);
    if (!uid) { setLoading(false); return; }

    fetch(`/api/notifications/user/${uid}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setNotifications(d.content || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    connectSSE(uid);

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      setReconnecting(false);
    };
  }, [connectSSE]);

  const manualReconnect = () => {
    if (!userId) return;
    retryCountRef.current = 0;
    setReconnecting(true);
    connectSSE(userId);
  };

  const markRead = async (id: string) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/user/${userId}/${id}/read`, {
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

  const connStatus = connected
    ? { dot: 'bg-green-500', text: '실시간 연결됨', action: null }
    : reconnecting
      ? { dot: 'bg-yellow-400 animate-pulse', text: '재연결 중...', action: null }
      : { dot: 'rounded-full inline-block w-2 h-2', text: '연결 끊김', action: manualReconnect };

  return (
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>알림 센터</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${connStatus.dot}`}
                style={!connected && !reconnecting ? { background: 'rgba(14,14,14,0.25)' } : undefined} />
              <span className="text-xs" style={{ color: 'rgba(14,14,14,0.45)' }}>{connStatus.text}</span>
              {connStatus.action && (
                <button
                  onClick={connStatus.action}
                  className="text-xs underline hover:no-underline ml-1"
                  style={{ color: '#E8001D' }}
                >
                  다시 연결
                </button>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm font-semibold px-4 py-2 transition-colors"
              style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(14,14,14,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              모두 읽음 처리 ({unreadCount})
            </button>
          )}
        </div>

        {!userId ? (
          <div className="text-center py-20" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-base font-bold mb-2" style={{ color: '#0E0E0E' }}>로그인이 필요합니다</h2>
            <a href="/auth" className="inline-block mt-4 px-5 py-2 text-white text-sm font-semibold transition-colors" style={{ background: '#E8001D' }}>
              로그인
            </a>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="text-base font-bold mb-2" style={{ color: '#0E0E0E' }}>알림이 없습니다</h2>
            <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>주문, 배송 등 중요한 알림을 여기서 확인하세요</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className="p-4 flex items-start gap-3 cursor-pointer transition-colors"
                style={{
                  background: '#FFFFFF',
                  borderTop: '1px solid rgba(14,14,14,0.07)',
                  borderRight: '1px solid rgba(14,14,14,0.07)',
                  borderBottom: '1px solid rgba(14,14,14,0.07)',
                  borderLeft: !n.read ? '4px solid #E8001D' : '1px solid rgba(14,14,14,0.07)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
              >
                <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center" style={getTypeStyle(n.type)}>
                  <NotificationTypeIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold" style={{ color: n.read ? 'rgba(14,14,14,0.45)' : '#0E0E0E' }}>{n.title}</h3>
                    <span className="text-xs flex-shrink-0" style={{ color: 'rgba(14,14,14,0.35)' }}>
                      {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'rgba(14,14,14,0.5)' }}>{n.message}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#E8001D' }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
