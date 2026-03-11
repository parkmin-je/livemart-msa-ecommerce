'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

type Tab = 'info' | 'security' | 'address';

interface DashboardStats {
  orderCount: number;
  shippingCount: number;
  completedCount: number;
  couponCount: number;
}

interface SavedAddress {
  id: number;
  alias: string;
  recipient: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  isDefault: boolean;
}

interface MfaStatus {
  enabled: boolean;
  type?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phoneNumber: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [stats, setStats] = useState<DashboardStats>({ orderCount: 0, shippingCount: 0, completedCount: 0, couponCount: 0 });
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [mfa, setMfa] = useState<MfaStatus>({ enabled: false });
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ alias: '', recipient: '', phone: '', zipCode: '', address: '', detailAddress: '', isDefault: false });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName') || '';
    setProfile(p => ({ ...p, name }));
    if (!userId) { router.push('/auth'); return; }

    // 프로필 + 주문통계 + MFA 상태 병렬 로드
    Promise.all([
      fetch(`/api/users/${userId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/orders/user/${userId}?page=0&size=100`, { credentials: 'include' }).then(r => r.ok ? r.json() : { content: [] }).catch(() => ({ content: [] })),
      fetch(`/api/users/${userId}/mfa/status`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([userData, ordersData, mfaData]) => {
      if (userData) setProfile({ name: userData.name || name, email: userData.email || '', phoneNumber: userData.phoneNumber || '' });
      if (ordersData?.content) {
        const orders = ordersData.content as Array<{ status: string }>;
        setStats({
          orderCount: orders.length,
          shippingCount: orders.filter(o => o.status === 'SHIPPED' || o.status === 'PREPARING').length,
          completedCount: orders.filter(o => o.status === 'DELIVERED').length,
          couponCount: 0, // 쿠폰 API 별도
        });
      }
      if (mfaData) setMfa({ enabled: mfaData.enabled, type: mfaData.type });
    });

    // 쿠폰 수 별도 조회
    fetch(`/api/coupons?active=true`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown[]) => setStats(s => ({ ...s, couponCount: Array.isArray(data) ? data.length : 0 })))
      .catch(() => {});
  }, []);

  const loadAddresses = () => {
    const userId = localStorage.getItem('userId');
    setAddrLoading(true);
    fetch(`/api/users/${userId}/addresses`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: SavedAddress[]) => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => setAddresses([]))
      .finally(() => setAddrLoading(false));
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name, phoneNumber: profile.phoneNumber }),
      });
      if (!res.ok) throw new Error('저장 실패');
      localStorage.setItem('userName', profile.name);
      toast.success('프로필이 저장되었습니다');
    } catch { toast.error('저장 실패'); }
    setLoading(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { toast.error('새 비밀번호가 일치하지 않습니다'); return; }
    if (pw.next.length < 8) { toast.error('비밀번호는 8자 이상이어야 합니다'); return; }
    setLoading(true);
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      if (!res.ok) throw new Error('현재 비밀번호가 올바르지 않습니다');
      toast.success('비밀번호가 변경되었습니다');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '변경 실패'); }
    setLoading(false);
  };

  const toggleMfa = async () => {
    setMfaLoading(true);
    const userId = localStorage.getItem('userId');
    try {
      if (mfa.enabled) {
        const currentPw = window.prompt('MFA 비활성화를 위해 현재 비밀번호를 입력하세요:');
        if (!currentPw) { setMfaLoading(false); return; }
        const res = await fetch(`/api/users/${userId}/mfa/disable`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: currentPw }),
        });
        if (!res.ok) throw new Error('비밀번호가 올바르지 않습니다');
        setMfa({ enabled: false });
        toast.success('MFA가 비활성화되었습니다');
      } else {
        const res = await fetch(`/api/users/${userId}/mfa/setup`, {
          method: 'POST', credentials: 'include',
        });
        if (!res.ok) throw new Error('MFA 설정 실패');
        const data = await res.json();
        // TOTP QR 코드 표시
        if (data.qrCodeUrl) {
          window.open(data.qrCodeUrl, '_blank', 'width=400,height=400');
        }
        toast.success('인증 앱으로 QR 코드를 스캔하세요. 설정 후 다시 로그인이 필요합니다.');
        setMfa({ enabled: true, type: 'TOTP' });
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '설정 실패'); }
    setMfaLoading(false);
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`/api/users/${userId}/addresses`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddr),
      });
      if (!res.ok) throw new Error('저장 실패');
      toast.success('배송지가 저장되었습니다');
      setShowAddAddr(false);
      setNewAddr({ alias: '', recipient: '', phone: '', zipCode: '', address: '', detailAddress: '', isDefault: false });
      loadAddresses();
    } catch { toast.error('배송지 저장 실패'); }
  };

  const deleteAddress = async (id: number) => {
    const userId = localStorage.getItem('userId');
    try {
      await fetch(`/api/users/${userId}/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success('삭제되었습니다');
    } catch { toast.error('삭제 실패'); }
  };

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'info', label: '기본 정보', emoji: '👤' },
    { id: 'security', label: '보안', emoji: '🔐' },
    { id: 'address', label: '배송지', emoji: '📍' },
  ];

  return (
    <main className="min-h-screen bg-gray-100 pb-14 md:pb-0">
      <GlobalNav />
      <div className="max-w-[900px] mx-auto px-4 py-6">

        {/* ── 마이 대시보드 ── */}
        <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">
              {profile.name ? profile.name[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="font-bold text-lg">{profile.name || '사용자'}님</p>
              <p className="text-white/70 text-sm">{profile.email || '이메일 미설정'}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: '사용가능 쿠폰', value: `${stats.couponCount}장`, icon: '🎟️', href: '/admin/coupons' },
              { label: '배송중', value: `${stats.shippingCount}건`, icon: '🚚', href: '/my-orders' },
              { label: '구매완료', value: `${stats.completedCount}건`, icon: '✅', href: '/my-orders' },
              { label: '전체 주문', value: `${stats.orderCount}건`, icon: '📋', href: '/my-orders' },
            ].map(item => (
              <a key={item.label} href={item.href} className="bg-white/15 rounded-xl py-3 px-1 hover:bg-white/25 transition-colors">
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="font-black text-sm">{item.value}</div>
                <div className="text-white/60 text-[10px] mt-0.5">{item.label}</div>
              </a>
            ))}
          </div>
        </div>

        {/* ── 빠른 바로가기 ── */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-6">
          {[
            { href: '/my-orders', icon: '📋', label: '주문내역' },
            { href: '/wishlist', icon: '❤️', label: '위시리스트' },
            { href: '/returns', icon: '🔄', label: '반품/교환' },
            { href: '/notifications', icon: '🔔', label: '알림' },
            { href: '/cart', icon: '🛒', label: '장바구니' },
            { href: '/delivery', icon: '📦', label: '배송조회' },
            { href: '/admin/coupons', icon: '🎟️', label: '쿠폰함' },
            { href: '/seller', icon: '🏪', label: '판매자' },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="bg-white rounded-xl p-3 flex flex-col items-center gap-1.5 hover:shadow-md hover:border-red-200 border border-gray-100 transition-all group">
              <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-xs font-medium text-gray-600 group-hover:text-red-600 transition-colors">{item.label}</span>
            </a>
          ))}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-4">내 정보 설정</h1>
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
                <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'address') loadAddresses(); }}
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
          <div className="flex-1 space-y-4">
            {/* ─ 기본 정보 ─ */}
            {tab === 'info' && (
              <form onSubmit={saveProfile} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-bold text-gray-900 text-lg">기본 정보</h2>
                <div>
                  <label className="form-label">아이디 (이메일)</label>
                  <input type="text" value={profile.email} readOnly className="form-input bg-gray-50 text-gray-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="form-label">이름</label>
                  <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">전화번호</label>
                  <input type="tel" value={profile.phoneNumber} onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="010-0000-0000" className="form-input" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary px-6">
                  {loading ? '저장중...' : '저장하기'}
                </button>
              </form>
            )}

            {/* ─ 보안 ─ */}
            {tab === 'security' && (
              <div className="space-y-4">
                <form onSubmit={changePassword} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                  <h2 className="font-bold text-gray-900 text-lg">비밀번호 변경</h2>
                  <div>
                    <label className="form-label">현재 비밀번호</label>
                    <input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} className="form-input" required />
                  </div>
                  <div>
                    <label className="form-label">새 비밀번호 (8자 이상)</label>
                    <input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} className="form-input" required minLength={8} />
                  </div>
                  <div>
                    <label className="form-label">새 비밀번호 확인</label>
                    <input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} className="form-input" required />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary px-6">
                    {loading ? '변경중...' : '비밀번호 변경'}
                  </button>
                </form>

                {/* MFA 설정 */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">2단계 인증 (MFA)</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {mfa.enabled
                          ? `TOTP 인증 앱으로 보호 중 (${mfa.type || 'TOTP'})`
                          : '계정을 더 안전하게 보호하려면 2단계 인증을 활성화하세요'}
                      </p>
                    </div>
                    <button
                      onClick={toggleMfa}
                      disabled={mfaLoading}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                        mfa.enabled
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {mfaLoading ? '처리중...' : mfa.enabled ? '비활성화' : '활성화'}
                    </button>
                  </div>
                  {mfa.enabled && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-green-700 text-sm">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      2단계 인증이 활성화되어 있습니다. 로그인 시 인증 앱 코드가 필요합니다.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─ 배송지 ─ */}
            {tab === 'address' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 text-lg">배송지 관리</h2>
                  <button onClick={() => setShowAddAddr(!showAddAddr)} className="btn-primary px-4 text-sm">
                    {showAddAddr ? '취소' : '+ 새 배송지'}
                  </button>
                </div>

                {showAddAddr && (
                  <form onSubmit={saveAddress} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                    <h3 className="font-semibold text-gray-900">새 배송지 추가</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">별칭 (예: 집, 회사)</label>
                        <input type="text" value={newAddr.alias} onChange={e => setNewAddr(a => ({ ...a, alias: e.target.value }))} className="form-input" placeholder="집" required />
                      </div>
                      <div>
                        <label className="form-label">수령인</label>
                        <input type="text" value={newAddr.recipient} onChange={e => setNewAddr(a => ({ ...a, recipient: e.target.value }))} className="form-input" required />
                      </div>
                      <div>
                        <label className="form-label">전화번호</label>
                        <input type="tel" value={newAddr.phone} onChange={e => setNewAddr(a => ({ ...a, phone: e.target.value }))} className="form-input" placeholder="010-0000-0000" required />
                      </div>
                      <div>
                        <label className="form-label">우편번호</label>
                        <input type="text" value={newAddr.zipCode} onChange={e => setNewAddr(a => ({ ...a, zipCode: e.target.value }))} className="form-input" required />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="form-label">주소</label>
                        <input type="text" value={newAddr.address} onChange={e => setNewAddr(a => ({ ...a, address: e.target.value }))} className="form-input" required />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="form-label">상세 주소</label>
                        <input type="text" value={newAddr.detailAddress} onChange={e => setNewAddr(a => ({ ...a, detailAddress: e.target.value }))} className="form-input" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={newAddr.isDefault} onChange={e => setNewAddr(a => ({ ...a, isDefault: e.target.checked }))} className="rounded" />
                      기본 배송지로 설정
                    </label>
                    <button type="submit" className="btn-primary px-6 text-sm">저장</button>
                  </form>
                )}

                {addrLoading ? (
                  <div className="space-y-3">
                    {[1,2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
                    <div className="text-5xl mb-3">📍</div>
                    <p className="font-medium">저장된 배송지가 없습니다</p>
                    <p className="text-sm mt-1">+ 새 배송지 버튼으로 추가하세요</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr.id} className={`bg-white rounded-xl border p-4 ${addr.isDefault ? 'border-red-200' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{addr.alias}</span>
                              {addr.isDefault && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">기본</span>}
                            </div>
                            <p className="text-sm text-gray-700">{addr.recipient} · {addr.phone}</p>
                            <p className="text-sm text-gray-500 mt-0.5">[{addr.zipCode}] {addr.address} {addr.detailAddress}</p>
                          </div>
                          <button onClick={() => deleteAddress(addr.id)}
                            className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors">삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
