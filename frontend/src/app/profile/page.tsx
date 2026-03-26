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

// SVG icon components to replace emojis
function IconOrder() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function IconShipping() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 8a2 2 0 002 2h8a2 2 0 002-2l1-8M10 12a1 1 0 102 0 1 1 0 00-2 0z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}
function IconCoupon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}
function IconWishlist() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconSeller() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const QUICK_LINKS = [
  { href: '/my-orders', icon: <IconOrder />, label: '주문내역' },
  { href: '/wishlist', icon: <IconWishlist />, label: '위시리스트' },
  { href: '/cart', icon: <IconCart />, label: '장바구니' },
  { href: '/admin/coupons', icon: <IconCoupon />, label: '쿠폰함' },
  { href: '/delivery', icon: <IconShipping />, label: '배송조회' },
  { href: '/profile#address', icon: <IconPin />, label: '배송지' },
  { href: '/seller', icon: <IconSeller />, label: '판매자' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'info', label: '기본 정보' },
  { id: 'security', label: '보안' },
  { id: 'address', label: '배송지' },
];

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
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpInput, setMfaOtpInput] = useState('');
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);
  const [mfaStep, setMfaStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({
    alias: '', recipient: '', phone: '', zipCode: '', address: '', detailAddress: '', isDefault: false,
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName') || '';
    setProfile(p => ({ ...p, name }));
    if (!userId) { router.push('/auth'); return; }

    Promise.all([
      fetch(`/api/users/${userId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/orders/user/${userId}?page=0&size=100`, { credentials: 'include' }).then(r => r.ok ? r.json() : { content: [] }).catch(() => ({ content: [] })),
      fetch(`/api/v1/mfa/status`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([userData, ordersData, mfaData]) => {
      if (userData) setProfile({ name: userData.name || name, email: userData.email || '', phoneNumber: userData.phoneNumber || '' });
      if (ordersData?.content) {
        const orders = ordersData.content as Array<{ status: string }>;
        setStats({
          orderCount: orders.length,
          shippingCount: orders.filter(o => o.status === 'SHIPPED' || o.status === 'PREPARING').length,
          completedCount: orders.filter(o => o.status === 'DELIVERED').length,
          couponCount: 0,
        });
      }
      if (mfaData) setMfa({ enabled: mfaData.enabled, type: mfaData.type });
    });

    fetch(`/api/coupons?active=true`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data : (data as { content?: unknown[] })?.content ?? [];
        setStats(s => ({ ...s, couponCount: arr.length }));
      })
      .catch(() => {});
  }, [router]);

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
    if (mfa.enabled) {
      // 비활성화는 기존 방식 유지
      setMfaLoading(true);
      try {
        const currentPw = window.prompt('MFA 비활성화를 위해 현재 비밀번호를 입력하세요:');
        if (!currentPw) { setMfaLoading(false); return; }
        const res = await fetch(`/api/v1/mfa/disable`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: currentPw }),
        });
        if (!res.ok) throw new Error('비밀번호가 올바르지 않습니다');
        setMfa({ enabled: false });
        toast.success('MFA가 비활성화되었습니다');
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '설정 실패'); }
      setMfaLoading(false);
    } else {
      // 활성화: 완전한 TOTP 설정 플로우
      setMfaLoading(true);
      try {
        const res = await fetch(`/api/v1/mfa/setup`, { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('MFA 설정 초기화 실패');
        const data = await res.json();
        setMfaQrCode(data.qrCodeImage || data.qrCodeUrl || null);
        setMfaSecret(data.secret || null);
        setMfaStep('qr');
        setMfaOtpInput('');
        setMfaBackupCodes([]);
        setShowMfaModal(true);
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '설정 실패'); }
      setMfaLoading(false);
    }
  };

  const verifyMfaOtp = async () => {
    if (mfaOtpInput.length !== 6) { toast.error('6자리 코드를 입력하세요'); return; }
    setMfaLoading(true);
    try {
      const res = await fetch(`/api/v1/mfa/verify`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaOtpInput }),
      });
      if (!res.ok) throw new Error('인증 코드가 올바르지 않습니다');
      const data = await res.json();
      setMfaBackupCodes(data.backupCodes || []);
      setMfa({ enabled: true, type: 'TOTP' });
      setMfaStep('backup');
      toast.success('2FA가 활성화되었습니다!');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '인증 실패'); }
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

  const inputClass = 'w-full px-4 py-3 text-sm focus:outline-none transition-colors';
  const inputStyle = { border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' };
  const labelClass = 'block text-[10px] font-semibold uppercase tracking-widest mb-1.5';
  const labelStyle = { color: 'rgba(14,14,14,0.45)' };

  return (
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      {/* Profile header */}
      <div className="text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-[900px] mx-auto px-4 py-8">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-14 h-14 bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-white">
                {profile.name ? profile.name[0].toUpperCase() : '?'}
              </span>
            </div>
            <div>
              <p className="font-black text-lg tracking-tight">{profile.name || '사용자'}님</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.email || '이메일 미설정'}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '쿠폰', value: `${stats.couponCount}`, unit: '장', icon: <IconCoupon />, href: '/admin/coupons' },
              { label: '배송중', value: `${stats.shippingCount}`, unit: '건', icon: <IconShipping />, href: '/my-orders' },
              { label: '구매완료', value: `${stats.completedCount}`, unit: '건', icon: <IconCheck />, href: '/my-orders' },
              { label: '전체 주문', value: `${stats.orderCount}`, unit: '건', icon: <IconOrder />, href: '/my-orders' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                className="border border-white/8 py-4 px-3 hover:border-white/20 transition-colors text-center group"
              >
                <div className="text-white/30 group-hover:text-white/50 transition-colors flex justify-center mb-2">
                  {item.icon}
                </div>
                <div className="font-black text-lg tabular-nums leading-none">
                  {item.value}
                  <span className="text-xs font-medium ml-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.unit}</span>
                </div>
                <div className="text-[10px] mt-1 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.label}</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-6">
        {/* Quick links */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
          {QUICK_LINKS.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="p-3.5 flex flex-col items-center gap-2 transition-colors group"
              style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.07)')}
            >
              <span style={{ color: 'rgba(14,14,14,0.4)' }}>{item.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(14,14,14,0.55)' }}>{item.label}</span>
            </a>
          ))}
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar tabs */}
          <aside className="w-44 flex-shrink-0">
            <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              {/* Avatar */}
              <div className="p-5 text-center" style={{ borderBottom: '1px solid rgba(14,14,14,0.06)' }}>
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-2" style={{ background: '#EDEBE4' }}>
                  <span className="text-xl font-black" style={{ color: 'rgba(14,14,14,0.4)' }}>
                    {profile.name ? profile.name[0].toUpperCase() : '?'}
                  </span>
                </div>
                <p className="font-semibold text-sm tracking-tight" style={{ color: '#0E0E0E' }}>{profile.name || '사용자'}</p>
                <p className="text-[10px] mt-0.5 truncate max-w-[130px] mx-auto" style={{ color: 'rgba(14,14,14,0.4)' }}>{profile.email || ''}</p>
              </div>

              {/* Tab nav */}
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); if (t.id === 'address') loadAddresses(); }}
                  className="w-full text-left px-4 py-3.5 text-sm font-medium transition-colors border-l-2"
                  style={{
                    borderLeftColor: tab === t.id ? '#0E0E0E' : 'transparent',
                    background: tab === t.id ? '#F7F6F1' : 'transparent',
                    color: tab === t.id ? '#0E0E0E' : 'rgba(14,14,14,0.5)',
                    fontWeight: tab === t.id ? 600 : 400,
                  }}
                >
                  {t.label}
                </button>
              ))}

              {/* Extra links */}
              <div className="p-3" style={{ borderTop: '1px solid rgba(14,14,14,0.06)' }}>
                <a href="/my-orders"
                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                  style={{ color: 'rgba(14,14,14,0.5)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F7F6F1'; e.currentTarget.style.color = '#0E0E0E'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(14,14,14,0.5)'; }}
                >
                  <IconOrder />주문 내역
                </a>
                <a href="/wishlist"
                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                  style={{ color: 'rgba(14,14,14,0.5)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F7F6F1'; e.currentTarget.style.color = '#0E0E0E'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(14,14,14,0.5)'; }}
                >
                  <IconWishlist />위시리스트
                </a>
              </div>
            </div>
          </aside>

          {/* Tab content */}
          <div className="flex-1 space-y-4">

            {/* Basic info tab */}
            {tab === 'info' && (
              <form onSubmit={saveProfile} className="p-6 space-y-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <h2 className={labelClass} style={labelStyle}>기본 정보</h2>
                <div>
                  <label className={labelClass} style={labelStyle}>아이디 (이메일)</label>
                  <input type="text" value={profile.email} readOnly className={inputClass} style={{ ...inputStyle, background: '#F7F6F1', color: 'rgba(14,14,14,0.4)', cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>이름</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>전화번호</label>
                  <input
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="010-0000-0000"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="text-white text-sm font-bold px-8 py-2.5 transition-colors disabled:opacity-50"
                  style={{ background: '#0A0A0A' }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.background = '#E8001D')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                >
                  {loading ? '저장중...' : '저장하기'}
                </button>
              </form>
            )}

            {/* Security tab */}
            {tab === 'security' && (
              <div className="space-y-4">
                <form onSubmit={changePassword} className="p-6 space-y-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <h2 className={labelClass} style={labelStyle}>비밀번호 변경</h2>
                  <div>
                    <label className={labelClass} style={labelStyle}>현재 비밀번호</label>
                    <input
                      type="password"
                      value={pw.current}
                      onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>새 비밀번호 <span className="text-[9px] font-normal normal-case">(8자 이상)</span></label>
                    <input
                      type="password"
                      value={pw.next}
                      onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={pw.confirm}
                      onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                      className={inputClass}
                      style={{ ...inputStyle, borderColor: pw.confirm && pw.next !== pw.confirm ? '#E8001D' : 'rgba(14,14,14,0.14)' }}
                      required
                    />
                    {pw.confirm && pw.next !== pw.confirm && (
                      <p className="text-xs mt-1.5" style={{ color: '#E8001D' }}>비밀번호가 일치하지 않습니다</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="text-white text-sm font-bold px-8 py-2.5 transition-colors disabled:opacity-50"
                    style={{ background: '#0A0A0A' }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = '#E8001D')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                  >
                    {loading ? '변경중...' : '비밀번호 변경'}
                  </button>
                </form>

                {/* MFA */}
                <div className="p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className={`${labelClass} mb-2`} style={labelStyle}>2단계 인증</h2>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0E0E0E' }}>
                        {mfa.enabled ? `TOTP 인증 앱 보호 중 (${mfa.type || 'TOTP'})` : '2단계 인증 비활성화됨'}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(14,14,14,0.45)' }}>
                        {mfa.enabled
                          ? '로그인 시 인증 앱 코드가 필요합니다.'
                          : '계정을 더 안전하게 보호하려면 2단계 인증을 활성화하세요.'}
                      </p>
                    </div>
                    <button
                      onClick={toggleMfa}
                      disabled={mfaLoading}
                      className="flex-shrink-0 px-4 py-2 text-xs font-bold border transition-colors disabled:opacity-50"
                      style={mfa.enabled
                        ? { border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.65)' }
                        : { border: '1px solid #0A0A0A', background: '#0A0A0A', color: '#FFFFFF' }
                      }
                    >
                      {mfaLoading ? '처리중...' : mfa.enabled ? '비활성화' : '활성화'}
                    </button>
                  </div>
                  {mfa.enabled && (
                    <div className="mt-4 flex items-center gap-2.5 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-xs">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      2단계 인증이 활성화되어 있습니다. 로그인 시 인증 앱 코드가 필요합니다.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address tab */}
            {tab === 'address' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={labelClass} style={labelStyle}>배송지 관리</h2>
                  <button
                    onClick={() => setShowAddAddr(!showAddAddr)}
                    className="text-xs font-semibold px-4 py-2 transition-colors"
                    style={{ border: '1px solid #0E0E0E', color: '#0E0E0E' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0A0A0A'; e.currentTarget.style.color = '#FFFFFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#0E0E0E'; }}
                  >
                    {showAddAddr ? '취소' : '+ 새 배송지'}
                  </button>
                </div>

                {showAddAddr && (
                  <form onSubmit={saveAddress} className="p-6 space-y-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                    <h3 className={labelClass} style={labelStyle}>새 배송지 추가</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} style={labelStyle}>별칭</label>
                        <input type="text" value={newAddr.alias} onChange={e => setNewAddr(a => ({ ...a, alias: e.target.value }))} className={inputClass} style={inputStyle} placeholder="집, 회사 등" required />
                      </div>
                      <div>
                        <label className={labelClass} style={labelStyle}>수령인</label>
                        <input type="text" value={newAddr.recipient} onChange={e => setNewAddr(a => ({ ...a, recipient: e.target.value }))} className={inputClass} style={inputStyle} required />
                      </div>
                      <div>
                        <label className={labelClass} style={labelStyle}>전화번호</label>
                        <input type="tel" value={newAddr.phone} onChange={e => setNewAddr(a => ({ ...a, phone: e.target.value }))} className={inputClass} style={inputStyle} placeholder="010-0000-0000" required />
                      </div>
                      <div>
                        <label className={labelClass} style={labelStyle}>우편번호</label>
                        <input type="text" value={newAddr.zipCode} onChange={e => setNewAddr(a => ({ ...a, zipCode: e.target.value }))} className={inputClass} style={inputStyle} required />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass} style={labelStyle}>주소</label>
                        <input type="text" value={newAddr.address} onChange={e => setNewAddr(a => ({ ...a, address: e.target.value }))} className={inputClass} style={inputStyle} required />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass} style={labelStyle}>상세 주소</label>
                        <input type="text" value={newAddr.detailAddress} onChange={e => setNewAddr(a => ({ ...a, detailAddress: e.target.value }))} className={inputClass} style={inputStyle} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: '#0E0E0E' }}>
                      <input
                        type="checkbox"
                        checked={newAddr.isDefault}
                        onChange={e => setNewAddr(a => ({ ...a, isDefault: e.target.checked }))}
                        className="w-4 h-4 accent-stone-800"
                      />
                      기본 배송지로 설정
                    </label>
                    <button
                      type="submit"
                      className="text-white text-sm font-bold px-8 py-2.5 transition-colors"
                      style={{ background: '#0A0A0A' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                    >
                      저장
                    </button>
                  </form>
                )}

                {addrLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 animate-pulse" style={{ background: '#EDEBE4' }} />
                    ))}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="py-14 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                    <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4" style={{ background: '#EDEBE4', color: 'rgba(14,14,14,0.4)' }}>
                      <IconPin />
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#0E0E0E' }}>저장된 배송지가 없습니다</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(14,14,14,0.45)' }}>새 배송지 버튼으로 추가하세요</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div
                        key={addr.id}
                        className="p-5"
                        style={{ background: '#FFFFFF', border: addr.isDefault ? '1px solid #0E0E0E' : '1px solid rgba(14,14,14,0.07)' }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-bold text-sm" style={{ color: '#0E0E0E' }}>{addr.alias}</span>
                              {addr.isDefault && (
                                <span className="text-[10px] font-bold text-white px-1.5 py-0.5 uppercase tracking-wider" style={{ background: '#0E0E0E' }}>
                                  기본
                                </span>
                              )}
                            </div>
                            <p className="text-sm" style={{ color: 'rgba(14,14,14,0.7)' }}>{addr.recipient} · {addr.phone}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(14,14,14,0.45)' }}>
                              [{addr.zipCode}] {addr.address} {addr.detailAddress}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteAddress(addr.id)}
                            className="text-xs px-2.5 py-1.5 transition-colors"
                            style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.45)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,0,29,0.4)'; e.currentTarget.style.color = '#E8001D'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(14,14,14,0.14)'; e.currentTarget.style.color = 'rgba(14,14,14,0.45)'; }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      {/* 2FA TOTP 설정 모달 */}
      {showMfaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
              <h2 className="font-black" style={{ color: '#0E0E0E' }}>
                {mfaStep === 'qr' && 'QR 코드 스캔'}
                {mfaStep === 'verify' && 'OTP 코드 확인'}
                {mfaStep === 'backup' && '백업 코드 저장'}
              </h2>
              {mfaStep !== 'backup' && (
                <button
                  onClick={() => setShowMfaModal(false)}
                  className="text-xl font-bold transition-colors"
                  style={{ color: 'rgba(14,14,14,0.4)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.4)')}
                >
                  ×
                </button>
              )}
            </div>

            <div className="px-6 py-5">
              {mfaStep === 'qr' && (
                <div className="text-center">
                  <p className="text-sm mb-4" style={{ color: 'rgba(14,14,14,0.6)' }}>
                    Google Authenticator 또는 Authy 앱으로 QR 코드를 스캔하세요.
                  </p>
                  {mfaQrCode ? (
                    <div className="flex justify-center mb-4">
                      <img
                        src={mfaQrCode.startsWith('data:') ? mfaQrCode : `data:image/png;base64,${mfaQrCode}`}
                        alt="2FA QR 코드"
                        className="w-48 h-48 p-2"
                        style={{ border: '1px solid rgba(14,14,14,0.12)' }}
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 mx-auto mb-4 flex items-center justify-center" style={{ background: '#EDEBE4' }}>
                      <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>QR 코드 로딩중...</span>
                    </div>
                  )}
                  {mfaSecret && (
                    <div className="px-4 py-2 mb-4" style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.1)' }}>
                      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(14,14,14,0.4)' }}>수동 입력 키</p>
                      <p className="font-mono text-sm break-all" style={{ color: '#0E0E0E' }}>{mfaSecret}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setMfaStep('verify')}
                    className="w-full py-3 text-white text-sm font-bold transition-colors"
                    style={{ background: '#0A0A0A' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                  >
                    스캔 완료, 인증 코드 입력
                  </button>
                </div>
              )}

              {mfaStep === 'verify' && (
                <div>
                  <p className="text-sm mb-4" style={{ color: 'rgba(14,14,14,0.6)' }}>
                    인증 앱에 표시된 6자리 코드를 입력하세요.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={mfaOtpInput}
                    onChange={e => setMfaOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none mb-4"
                    style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E' }}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setMfaStep('qr')}
                      className="flex-1 py-3 text-sm font-semibold transition-colors"
                      style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.65)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.14)')}
                    >
                      이전
                    </button>
                    <button
                      onClick={verifyMfaOtp}
                      disabled={mfaLoading || mfaOtpInput.length !== 6}
                      className="flex-1 py-3 text-white text-sm font-bold transition-colors disabled:opacity-50"
                      style={{ background: '#0A0A0A' }}
                      onMouseEnter={e => !mfaLoading && (e.currentTarget.style.background = '#E8001D')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                    >
                      {mfaLoading ? '확인중...' : '확인'}
                    </button>
                  </div>
                </div>
              )}

              {mfaStep === 'backup' && (
                <div>
                  <div className="flex items-start gap-3 mb-4 p-3" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(161,98,7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs" style={{ color: 'rgb(133,77,14)' }}>
                      아래 백업 코드를 안전한 곳에 저장하세요. 인증 앱을 분실한 경우 로그인에 사용할 수 있습니다. 각 코드는 1회만 사용 가능합니다.
                    </p>
                  </div>
                  {mfaBackupCodes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {mfaBackupCodes.map((code, i) => (
                        <div key={i} className="px-3 py-2" style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.1)' }}>
                          <span className="font-mono text-sm" style={{ color: '#0E0E0E' }}>{code}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-center py-4" style={{ color: 'rgba(14,14,14,0.5)' }}>백업 코드가 없습니다.</p>
                  )}
                  <button
                    onClick={() => setShowMfaModal(false)}
                    className="w-full py-3 text-white text-sm font-bold transition-colors"
                    style={{ background: '#0A0A0A' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                  >
                    완료 (저장했습니다)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
