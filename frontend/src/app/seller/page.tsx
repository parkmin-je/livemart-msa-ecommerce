'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';
import SellerAgentPanel from './components/SellerAgentPanel';

interface DashboardData {
  totalRevenue?: number;
  totalOrders?: number;
  totalProducts?: number;
  pendingOrders?: number;
  recentOrders?: Array<{ id: number; status: string; totalAmount: number; createdAt: string }>;
  lowStockProducts?: Array<{ id: number; name: string; stockQuantity: number }>;
}

interface NewProduct {
  name: string; description: string; price: string; stockQuantity: string; categoryId: string; imageUrl: string;
}

interface AiDescription {
  oneLiner: string;
  bodyText: string;
  seoTags: string[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', CONFIRMED: '확인', PAYMENT_COMPLETED: '결제완료',
  SHIPPED: '배송중', DELIVERED: '완료', CANCELLED: '취소',
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDING:           { background: 'rgba(234,179,8,0.08)',  color: 'rgb(161,98,7)',   border: '1px solid rgba(234,179,8,0.2)' },
  CONFIRMED:         { background: 'rgba(37,99,235,0.08)',  color: 'rgb(29,78,216)',  border: '1px solid rgba(37,99,235,0.2)' },
  PAYMENT_COMPLETED: { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)',   border: '1px solid rgba(16,185,129,0.2)' },
  SHIPPED:           { background: 'rgba(147,51,234,0.08)', color: 'rgb(109,40,217)', border: '1px solid rgba(147,51,234,0.2)' },
  DELIVERED:         { background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)',   border: '1px solid rgba(16,185,129,0.2)' },
  CANCELLED:         { background: 'rgba(14,14,14,0.06)',   color: 'rgba(14,14,14,0.45)', border: '1px solid rgba(14,14,14,0.12)' },
};

const inputStyle: React.CSSProperties = { border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' };
const labelStyle: React.CSSProperties = { color: 'rgba(14,14,14,0.6)' };

export default function SellerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'products' | 'orders' | 'agent'>('dashboard');
  const [data, setData] = useState<DashboardData>({});
  const [products, setProducts] = useState<Array<{ id: number; name: string; price: number; stockQuantity: number; categoryId?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({ name: '', description: '', price: '', stockQuantity: '', categoryId: '1', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDesc, setAiDesc] = useState<AiDescription | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [sellerStatus, setSellerStatus] = useState<'loading' | 'seller' | 'not-seller'>('loading');
  const [registerForm, setRegisterForm] = useState({ businessType: 'INDIVIDUAL', businessName: '', ownerName: '', phone: '', category: '전자기기', agree: false });
  const [registering, setRegistering] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid);
    if (!uid) { setSellerStatus('not-seller'); setLoading(false); return; }

    const dashUrl = `/api/sellers/${uid}/dashboard`;
    Promise.all([
      fetch(dashUrl, { credentials: 'include' })
        .then(async r => {
          if (!r.ok) { setSellerStatus('not-seller'); return {}; }
          const d = await r.json();
          const hasData = d && (d.totalRevenue != null || d.totalOrders != null || d.totalProducts != null);
          setSellerStatus(hasData ? 'seller' : 'not-seller');
          return d;
        })
        .catch(() => { setSellerStatus('not-seller'); return {}; }),
      fetch('/api/products?page=0&size=50', { credentials: 'include' })
        .then(r => r.json()).catch(() => ({ content: [] })),
    ]).then(([dash, prods]) => {
      setData(dash);
      setProducts(prods.content || []);
    }).finally(() => setLoading(false));
  }, []);

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.agree) { toast.error('이용약관에 동의해주세요'); return; }
    setRegistering(true);
    try {
      const res = await fetch('/api/sellers/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          businessType: registerForm.businessType,
          businessName: registerForm.businessName,
          ownerName: registerForm.ownerName,
          phone: registerForm.phone,
          mainCategory: registerForm.category,
        }),
      });
      if (!res.ok && res.status !== 404 && res.status !== 405) {
        throw new Error('신청에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
      setRegisterDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다');
    }
    setRegistering(false);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name, description: newProduct.description,
          price: Number(newProduct.price), stockQuantity: Number(newProduct.stockQuantity),
          categoryId: Number(newProduct.categoryId),
          imageUrl: newProduct.imageUrl || `https://picsum.photos/seed/${Date.now()}/400/400`,
        }),
      });
      if (!res.ok) throw new Error('등록 실패');
      const created = await res.json();
      setProducts(prev => [created, ...prev]);
      toast.success('상품이 등록되었습니다!');
      setShowForm(false);
      setNewProduct({ name: '', description: '', price: '', stockQuantity: '', categoryId: '1', imageUrl: '' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '오류'); }
    setSaving(false);
  };

  const generateAiDescription = async () => {
    if (!newProduct.name.trim()) { toast.error('상품명을 먼저 입력하세요'); return; }
    setAiGenerating(true);
    setAiDesc(null);
    try {
      const res = await fetch('/api/ai/description', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: newProduct.name,
          keywords: newProduct.name.split(' ').filter(Boolean),
          tone: 'professional',
        }),
      });
      if (!res.ok) throw new Error('AI 서비스 연결 실패');
      const d: AiDescription = await res.json();
      setAiDesc(d);
      setNewProduct(p => ({ ...p, description: `${d.oneLiner}\n\n${d.bodyText}` }));
      toast.success('자동 설명이 생성되었습니다');
    } catch { toast.error('설명 생성 실패. 직접 입력해주세요.'); }
    setAiGenerating(false);
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('상품을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('삭제됐습니다');
    } catch { toast.error('삭제 실패'); }
  };

  const TABS = [
    { id: 'dashboard', label: '대시보드' },
    { id: 'products', label: '상품 관리' },
    { id: 'orders', label: '주문 관리' },
    { id: 'agent', label: '🤖 AI 에이전트' },
  ];

  const KPI = [
    {
      label: '총 매출', value: `${(data.totalRevenue || 0).toLocaleString()}원`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      accent: 'rgb(4,120,87)', bg: 'rgba(16,185,129,0.08)',
    },
    {
      label: '총 주문', value: `${(data.totalOrders || 0).toLocaleString()}건`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      accent: 'rgb(29,78,216)', bg: 'rgba(37,99,235,0.08)',
    },
    {
      label: '등록 상품', value: `${(data.totalProducts || 0).toLocaleString()}개`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      accent: 'rgb(109,40,217)', bg: 'rgba(147,51,234,0.08)',
    },
    {
      label: '처리 대기', value: `${(data.pendingOrders || 0).toLocaleString()}건`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      accent: '#E8001D', bg: 'rgba(232,0,29,0.08)',
    },
  ];

  const setTabTyped = (id: string) => {
    setTab(id as 'dashboard' | 'products' | 'orders' | 'agent');
    if (id === 'products') setShowForm(false);
  };

  // ── 비로그인 ───────────────────────────────────────────────
  if (!loading && !userId) {
    return (
      <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
        <GlobalNav />
        <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
          <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#0E0E0E' }}>로그인이 필요합니다</h2>
          <a href="/auth" className="inline-block mt-4 px-6 py-2.5 text-white text-sm font-bold transition-colors" style={{ background: '#E8001D' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#C8001A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}>
            로그인
          </a>
        </div>
      </div>
    );
  }

  // ── 판매자 미등록 — 등록 랜딩 페이지 ──────────────────────────
  if (!loading && sellerStatus === 'not-seller') {
    if (registerDone) {
      return (
        <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
          <GlobalNav />
          <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <svg className="w-8 h-8" style={{ color: 'rgb(4,120,87)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ color: '#0E0E0E' }}>판매자 신청이 완료되었습니다!</h2>
            <p className="text-sm mb-2" style={{ color: 'rgba(14,14,14,0.5)' }}>신청 내용을 검토 후 1-3 영업일 이내에 승인 결과를 이메일로 안내드립니다.</p>
            <p className="text-xs mb-8" style={{ color: 'rgba(14,14,14,0.4)' }}>승인 전까지는 판매자 센터 기능이 제한됩니다.</p>
            <a href="/" className="inline-block px-6 py-2.5 text-white text-sm font-bold transition-colors" style={{ background: '#0A0A0A' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}>
              홈으로 돌아가기
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
        <GlobalNav />

        {/* 히어로 섹션 */}
        <div className="py-16 px-4 text-white" style={{ background: '#0A0A0A' }}>
          <div className="max-w-[900px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-600/30 text-red-400 text-xs font-bold tracking-wider uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LiveMart 판매자 파트너
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
              LiveMart에서<br />
              <span className="text-red-500">지금 판매</span>를 시작하세요
            </h1>
            <p className="text-sm sm:text-base max-w-xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
              수십만 명의 활성 구매자에게 내 상품을 노출하세요. 쉬운 상품 등록, AI 설명 자동 생성, 실시간 매출 분석까지.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[700px] mx-auto mb-10">
              {[
                { icon: '🚀', title: '즉시 판매 시작', desc: '상품 등록 후 바로 판매 가능' },
                { icon: '🤖', title: 'AI 상품 설명', desc: 'AI가 상품 설명을 자동 생성' },
                { icon: '📊', title: '실시간 분석', desc: '매출·주문 현황 실시간 확인' },
              ].map(b => (
                <div key={b.title} className="p-5 text-left" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="text-2xl mb-2">{b.icon}</div>
                  <div className="text-sm font-bold text-white mb-1">{b.title}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 판매자 신청 폼 */}
        <div className="max-w-[560px] mx-auto px-4 py-12">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0E0E0E' }}>판매자 신청서</h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(14,14,14,0.5)' }}>심사 후 1-3 영업일 내에 승인 여부를 안내드립니다.</p>

          <form onSubmit={submitRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2" style={labelStyle}>사업자 유형 *</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'INDIVIDUAL', l: '개인 판매자', desc: '사업자 등록증 없이 판매' },
                  { v: 'BUSINESS', l: '사업자 판매자', desc: '사업자 등록증 보유' },
                ].map(t => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setRegisterForm(f => ({ ...f, businessType: t.v }))}
                    className="p-4 text-left transition-colors"
                    style={registerForm.businessType === t.v
                      ? { border: '2px solid #E8001D', background: 'rgba(232,0,29,0.04)' }
                      : { border: '2px solid rgba(14,14,14,0.14)' }}
                  >
                    <div className="text-sm font-bold mb-1" style={{ color: registerForm.businessType === t.v ? '#C8001A' : '#0E0E0E' }}>{t.l}</div>
                    <div className="text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>상호명 / 브랜드명 *</label>
              <input type="text" required value={registerForm.businessName}
                onChange={e => setRegisterForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="예: 홍길동상회 / MyBrand"
                className="w-full px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>대표자명 *</label>
              <input type="text" required value={registerForm.ownerName}
                onChange={e => setRegisterForm(f => ({ ...f, ownerName: e.target.value }))}
                placeholder="실명 입력"
                className="w-full px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>연락처 *</label>
              <input type="tel" required value={registerForm.phone}
                onChange={e => setRegisterForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="010-0000-0000"
                className="w-full px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>주요 판매 카테고리 *</label>
              <select value={registerForm.category}
                onChange={e => setRegisterForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                {['전자기기', '패션/의류', '식품/음료', '홈/리빙', '뷰티/화장품', '스포츠/레저', '도서/문구', '기타'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="p-4 space-y-2" style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.1)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(14,14,14,0.5)' }}>
                판매자 이용약관, 수수료 정책(카테고리별 5~12%), 개인정보 처리방침에 동의합니다.
                허위 정보 입력 시 판매 자격이 취소될 수 있습니다.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={registerForm.agree}
                  onChange={e => setRegisterForm(f => ({ ...f, agree: e.target.checked }))}
                  className="w-4 h-4 accent-red-600" />
                <span className="text-sm font-semibold" style={{ color: 'rgba(14,14,14,0.7)' }}>모든 약관에 동의합니다 *</span>
              </label>
            </div>

            <button type="submit" disabled={registering || !registerForm.agree}
              className="w-full py-3.5 text-white font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#E8001D' }}
              onMouseEnter={e => !(registering || !registerForm.agree) && (e.currentTarget.style.background = '#C8001A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}>
              {registering ? '신청 중...' : '판매자 신청하기'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      {/* Seller header bar */}
      <div className="text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Seller</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>판매자 센터</span>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-112px)]">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block" style={{ background: '#FFFFFF', borderRight: '1px solid rgba(14,14,14,0.07)' }}>
          <nav className="py-4">
            <p className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(14,14,14,0.4)' }}>메뉴</p>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTabTyped(t.id)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors"
                style={tab === t.id
                  ? { background: 'rgba(232,0,29,0.06)', color: '#E8001D', borderRight: '2px solid #E8001D' }
                  : { color: 'rgba(14,14,14,0.6)' }}
                onMouseEnter={e => tab !== t.id && (e.currentTarget.style.background = '#F7F6F1')}
                onMouseLeave={e => tab !== t.id && (e.currentTarget.style.background = 'transparent')}>
                {t.label}
              </button>
            ))}
            <div className="mx-4 my-3" style={{ borderTop: '1px solid rgba(14,14,14,0.08)' }} />
            {[{ href: '/seller/inventory', label: '재고 관리' }, { href: '/admin', label: '관리자 패널' }].map(link => (
              <a key={link.href} href={link.href} className="block px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'rgba(14,14,14,0.6)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F7F6F1'; e.currentTarget.style.color = '#0E0E0E'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(14,14,14,0.6)'; }}>
                {link.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full absolute top-[112px] z-10" style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
          <div className="flex overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTabTyped(t.id)}
                className="flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors"
                style={tab === t.id
                  ? { borderColor: '#E8001D', color: '#E8001D' }
                  : { borderColor: 'transparent', color: 'rgba(14,14,14,0.5)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 pb-14 md:pb-6 mt-10 md:mt-0 overflow-x-auto">
          {/* 대시보드 */}
          {tab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>판매자 대시보드</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>판매 현황을 확인하세요</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {KPI.map(k => (
                  <div key={k.label} className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                    <div className="inline-flex items-center justify-center w-9 h-9 mb-3" style={{ background: k.bg, color: k.accent }}>
                      {k.icon}
                    </div>
                    <p className="text-xs font-medium" style={{ color: 'rgba(14,14,14,0.5)' }}>{k.label}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: k.accent }}>{k.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '상품 등록', action: () => { setTab('products'); setShowForm(true); }, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg> },
                  { label: '재고 관리', action: () => router.push('/seller/inventory'), icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                  { label: '주문 확인', action: () => setTab('orders'), icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className="flex flex-col items-center gap-2 p-4 transition-colors"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.1)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,0,29,0.3)'; e.currentTarget.style.background = 'rgba(232,0,29,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(14,14,14,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}>
                    <span style={{ color: 'rgba(14,14,14,0.5)' }}>{item.icon}</span>
                    <span className="text-sm font-medium" style={{ color: 'rgba(14,14,14,0.7)' }}>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {data.lowStockProducts && data.lowStockProducts.length > 0 && (
                  <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(234,88,12,0.25)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h2 className="font-bold text-orange-700 text-sm">재고 부족 상품</h2>
                    </div>
                    <div className="space-y-2">
                      {data.lowStockProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}>
                          <span className="text-sm font-medium" style={{ color: '#0E0E0E' }}>{p.name}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(232,0,29,0.07)', color: '#C8001A', border: '1px solid rgba(232,0,29,0.2)' }}>재고 {p.stockQuantity}개</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm" style={{ color: '#0E0E0E' }}>최근 주문</h2>
                    <button onClick={() => setTab('orders')} className="text-xs text-red-600 hover:underline">전체보기</button>
                  </div>
                  {(data.recentOrders || []).length === 0 ? (
                    <p className="text-center text-sm py-6" style={{ color: 'rgba(14,14,14,0.4)' }}>최근 주문이 없습니다</p>
                  ) : (
                    <div>
                      {(data.recentOrders || []).slice(0, 5).map(o => (
                        <div key={o.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}>
                          <div>
                            <span className="text-sm font-medium" style={{ color: '#0E0E0E' }}>주문 #{o.id}</span>
                            <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5" style={STATUS_STYLE[o.status] || STATUS_STYLE.CANCELLED}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </div>
                          <span className="text-sm font-bold" style={{ color: '#0E0E0E' }}>{o.totalAmount.toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 상품 관리 */}
          {tab === 'products' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>상품 관리</h1>
                <button onClick={() => setShowForm(!showForm)}
                  className="px-4 py-2 text-sm font-semibold transition-colors"
                  style={showForm
                    ? { border: '1px solid rgba(14,14,14,0.2)', color: 'rgba(14,14,14,0.6)' }
                    : { background: '#E8001D', color: '#FFFFFF' }}
                  onMouseEnter={e => showForm
                    ? (e.currentTarget.style.background = '#F7F6F1')
                    : (e.currentTarget.style.background = '#C8001A')}
                  onMouseLeave={e => showForm
                    ? (e.currentTarget.style.background = 'transparent')
                    : (e.currentTarget.style.background = '#E8001D')}>
                  {showForm ? '취소' : '+ 상품 등록'}
                </button>
              </div>

              {showForm && (
                <form onSubmit={saveProduct} className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                  <h2 className="font-bold text-sm mb-4" style={{ color: '#0E0E0E' }}>새 상품 등록</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>상품명 *</label>
                      <input type="text" value={newProduct.name}
                        onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                        required placeholder="상품명을 입력하세요" />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold" style={labelStyle}>상품 설명</label>
                        <button type="button" onClick={generateAiDescription} disabled={aiGenerating}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 transition-colors disabled:opacity-50"
                          style={{ color: 'rgba(14,14,14,0.6)', background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.14)' }}
                          onMouseEnter={e => !aiGenerating && (e.currentTarget.style.background = '#EDEBE4')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#F7F6F1')}>
                          <svg className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          {aiGenerating ? '생성중...' : '자동 설명 생성'}
                        </button>
                      </div>
                      <textarea value={newProduct.description}
                        onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle}
                        rows={4} placeholder="상품 설명을 입력하거나 자동 생성을 사용하세요" />
                      {aiDesc && (
                        <div className="mt-2 p-3" style={{ background: '#F7F6F1', border: '1px solid rgba(14,14,14,0.1)' }}>
                          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(14,14,14,0.6)' }}>SEO 태그</p>
                          <div className="flex flex-wrap gap-1">
                            {aiDesc.seoTags.map((tag, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5" style={{ background: '#FFFFFF', color: 'rgba(14,14,14,0.6)', border: '1px solid rgba(14,14,14,0.14)' }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>가격 (원) *</label>
                      <input type="number" value={newProduct.price}
                        onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                        required min="0" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>재고 수량 *</label>
                      <input type="number" value={newProduct.stockQuantity}
                        onChange={e => setNewProduct(p => ({ ...p, stockQuantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                        required min="0" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>카테고리</label>
                      <select value={newProduct.categoryId}
                        onChange={e => setNewProduct(p => ({ ...p, categoryId: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                        <option value="1">전자기기</option>
                        <option value="2">패션</option>
                        <option value="3">식품</option>
                        <option value="4">홈/리빙</option>
                        <option value="5">뷰티</option>
                        <option value="6">스포츠</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>이미지 URL</label>
                      <input type="url" value={newProduct.imageUrl}
                        onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))}
                        className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                        placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button type="submit" disabled={saving}
                      className="px-6 py-2 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                      style={{ background: '#E8001D' }}
                      onMouseEnter={e => !saving && (e.currentTarget.style.background = '#C8001A')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}>
                      {saving ? '등록중...' : '등록하기'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="px-6 py-2 text-sm font-medium transition-colors"
                      style={{ border: '1px solid rgba(14,14,14,0.2)', color: 'rgba(14,14,14,0.6)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      취소
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
                  <span className="font-semibold text-sm" style={{ color: '#0E0E0E' }}>상품 목록 ({products.length}개)</span>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-sm" style={{ color: 'rgba(14,14,14,0.4)' }}>불러오는 중...</div>
                ) : products.length === 0 ? (
                  <div className="p-16 text-center">
                    <svg className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(14,14,14,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-sm" style={{ color: 'rgba(14,14,14,0.4)' }}>등록된 상품이 없습니다</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#F7F6F1', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
                        {['상품명','가격','재고','상태',''].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(14,14,14,0.5)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center" style={{ background: '#EDEBE4' }}>
                                <svg className="w-5 h-5" style={{ color: 'rgba(14,14,14,0.4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium truncate max-w-[200px]" style={{ color: '#0E0E0E' }}>{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.7)' }}>{p.price.toLocaleString()}원</td>
                          <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.7)' }}>{p.stockQuantity}개</td>
                          <td className="px-5 py-3">
                            {p.stockQuantity === 0
                              ? <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(232,0,29,0.07)', color: '#C8001A', border: '1px solid rgba(232,0,29,0.2)' }}>품절</span>
                              : p.stockQuantity <= 10
                              ? <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(234,88,12,0.08)', color: 'rgb(194,65,12)', border: '1px solid rgba(234,88,12,0.2)' }}>재고부족</span>
                              : <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)', border: '1px solid rgba(16,185,129,0.2)' }}>판매중</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => router.push(`/products/${p.id}`)}
                                className="px-2.5 py-1 text-xs transition-colors"
                                style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.6)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                보기
                              </button>
                              <button onClick={() => deleteProduct(p.id)}
                                className="px-2.5 py-1 text-xs transition-colors"
                                style={{ border: '1px solid rgba(232,0,29,0.2)', color: '#C8001A' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,0,29,0.06)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* AI 에이전트 */}
          {tab === 'agent' && (
            <div className="max-w-2xl">
              <div className="p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <SellerAgentPanel />
              </div>
            </div>
          )}

          {/* 주문 관리 */}
          {tab === 'orders' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold mb-6" style={{ color: '#0E0E0E' }}>주문 관리</h1>
              <div className="p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
                <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(14,14,14,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h2 className="text-base font-bold mb-1" style={{ color: '#0E0E0E' }}>주문 관리</h2>
                <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>판매자용 주문 관리 기능입니다</p>
                <button onClick={() => router.push('/my-orders')}
                  className="mt-4 px-5 py-2 text-white text-sm font-semibold transition-colors"
                  style={{ background: '#E8001D' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#C8001A')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#E8001D')}>
                  주문 목록 보기
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
