'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

type Tab = 'info' | 'security' | 'address';

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', username: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName') || '';
    setProfile(p => ({ ...p, name }));
    if (!userId) { router.push('/auth'); return; }
    fetch(`/api/users/${userId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setProfile({ name: d.name || name, email: d.email || '', phone: d.phone || '', username: d.username || '' }))
      .catch(() => {});
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(profile),
      });
      localStorage.setItem('userName', profile.name);
      toast.success('프로필이 저장되었습니다');
    } catch { toast.error('저장 실패'); }
    setLoading(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { toast.error('새 비밀번호가 일치하지 않습니다'); return; }
    setLoading(true);
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      if (!res.ok) throw new Error('현재 비밀번호가 올바르지 않습니다');
      toast.success('비밀번호가 변경되었습니다');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '변경 실패'); }
    setLoading(false);
  };

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'info', label: '기본 정보', emoji: '👤' },
    { id: 'security', label: '보안', emoji: '🔐' },
    { id: 'address', label: '배송지', emoji: '📍' },
  ];

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav />
      <div className="max-w-[900px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">내 정보</h1>
        <div className="flex gap-6 items-start">
          {/* 사이드 탭 */}
          <aside className="w-48 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">
                  {profile.name ? profile.name[0] : '👤'}
                </div>
                <p className="font-semibold text-gray-900 text-sm">{profile.name || '사용자'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{profile.email || ''}</p>
              </div>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'bg-red-50 text-red-600 border-r-2 border-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span>{t.emoji}</span>{t.label}
                </button>
              ))}
              <div className="p-3 border-t border-gray-50">
                <a href="/my-orders" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">📋 주문 내역</a>
                <a href="/wishlist" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">❤️ 위시리스트</a>
              </div>
            </div>
          </aside>

          {/* 콘텐츠 */}
          <div className="flex-1">
            {tab === 'info' && (
              <form onSubmit={saveProfile} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-bold text-gray-900 text-lg">기본 정보</h2>
                <div>
                  <label className="form-label">아이디</label>
                  <input type="text" value={profile.username} readOnly className="form-input bg-gray-50 text-gray-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="form-label">이름</label>
                  <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">이메일</label>
                  <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">전화번호</label>
                  <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="010-0000-0000" className="form-input" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary px-6">
                  {loading ? '저장중...' : '저장하기'}
                </button>
              </form>
            )}

            {tab === 'security' && (
              <form onSubmit={changePassword} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-bold text-gray-900 text-lg">비밀번호 변경</h2>
                <div>
                  <label className="form-label">현재 비밀번호</label>
                  <input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">새 비밀번호</label>
                  <input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">새 비밀번호 확인</label>
                  <input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} className="form-input" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary px-6">
                  {loading ? '변경중...' : '비밀번호 변경'}
                </button>
              </form>
            )}

            {tab === 'address' && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4">배송지 관리</h2>
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">📍</div>
                  <p className="font-medium">저장된 배송지가 없습니다</p>
                  <p className="text-sm mt-1">주문 시 입력한 배송지가 저장됩니다</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
