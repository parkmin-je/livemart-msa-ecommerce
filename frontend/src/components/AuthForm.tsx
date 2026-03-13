'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// OAuth2: Next.js rewrite → api-gateway(8080) → user-service
const USER_SERVICE = '';
// API 프록시 (Next.js next.config.js → localhost:8080 → user-service)
const API_BASE = '/api/users';

type Mode = 'login' | 'signup';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  verifyCode: string;
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [form, setForm] = useState<FormState>({
    email: '', password: '', confirmPassword: '', name: '', phone: '', verifyCode: '',
  });
  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  // 인증 코드 발송
  const sendCode = async () => {
    if (!form.email.includes('@')) { toast.error('올바른 이메일을 입력하세요'); return; }
    setSendingCode(true);
    try {
      const res = await fetch(`${API_BASE}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '전송 실패');

      toast.success(`${form.email}로 인증 코드를 발송했습니다`);
      setCodeSent(true);
      setCountdown(300);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '코드 전송 실패');
    }
    setSendingCode(false);
  };

  // 인증 코드 확인
  const verifyCode = async () => {
    if (!form.verifyCode) { toast.error('인증 코드를 입력하세요'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: form.verifyCode }),
      });
      const data = await res.json();
      if (data.verified) {
        toast.success('이메일 인증이 완료되었습니다');
        setCodeVerified(true);
      } else {
        toast.error(data.message || '인증 코드가 올바르지 않습니다');
      }
    } catch {
      toast.error('인증 확인 중 오류가 발생했습니다');
    }
    setLoading(false);
  };

  // 로그인
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '이메일 또는 비밀번호가 올바르지 않습니다');
      }
      const data = await res.json();
      // 토큰은 httpOnly 쿠키로 자동 저장 — localStorage에는 비민감 정보만 저장
      localStorage.setItem('userId', String(data.userId || ''));
      localStorage.setItem('userName', data.name || data.username || form.email.split('@')[0]);
      localStorage.setItem('userRole', data.role || 'USER');
      toast.success('로그인되었습니다');
      window.location.href = '/';
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '로그인 실패');
    }
    setLoading(false);
  };

  // 회원가입
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeVerified) { toast.error('이메일 인증을 완료해주세요'); return; }
    if (form.password !== form.confirmPassword) { toast.error('비밀번호가 일치하지 않습니다'); return; }
    if (form.password.length < 8) { toast.error('비밀번호는 8자 이상이어야 합니다'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          phoneNumber: form.phone || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '회원가입 실패');
      }
      toast.success('회원가입이 완료되었습니다. 로그인해주세요.');
      setMode('login');
      setCodeSent(false);
      setCodeVerified(false);
      setForm(f => ({ ...f, password: '', confirmPassword: '', verifyCode: '' }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다');
    }
    setLoading(false);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // OAuth2 리다이렉트
  const handleOAuth = (provider: 'kakao' | 'naver' | 'google') => {
    window.location.href = `${USER_SERVICE}/oauth2/authorization/${provider}`;
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setCodeSent(false);
    setCodeVerified(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side: brand panel */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[520px] flex-shrink-0 bg-gray-950 flex-col justify-between p-12">
        <a href="/" className="block">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-red-500">Live</span>
            <span className="text-white">Mart</span>
          </span>
        </a>
        <div>
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
            더 빠르게.<br />
            더 저렴하게.<br />
            <span className="text-red-500">지금 시작하세요.</span>
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            30만 개 이상의 상품 · 당일 출고 배송<br />
            안전 결제 · 무료 반품 보장
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { value: '30만+', label: '상품 수' },
            { value: '1일', label: '평균 배송' },
            { value: '99%', label: '고객 만족도' },
          ].map(item => (
            <div key={item.label} className="border border-white/8 p-4">
              <div className="text-white font-black text-xl tabular-nums">{item.value}</div>
              <div className="text-gray-600 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <a href="/">
              <span className="text-3xl font-black tracking-tight">
                <span className="text-red-600">Live</span>
                <span className="text-gray-900">Mart</span>
              </span>
            </a>
          </div>

          {/* Tab switcher */}
          <div className="flex mb-8 border-b border-gray-200">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  이메일
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                  required
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                  <input type="checkbox" className="accent-gray-900 w-3.5 h-3.5" />
                  자동 로그인
                </label>
                <button type="button" className="text-gray-400 hover:text-gray-700 transition-colors">
                  비밀번호 찾기
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-950 text-white py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Spinner /> : '로그인'}
              </button>
            </form>
          )}

          {/* Signup form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                  required
                />
              </div>

              {/* Email + verify */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => { set('email', e.target.value); setCodeSent(false); setCodeVerified(false); }}
                    placeholder="example@email.com"
                    className="flex-1 px-4 py-3 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                    readOnly={codeVerified}
                    required
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={sendingCode || codeVerified || countdown > 0}
                    className="px-3 py-3 border border-gray-900 text-xs font-bold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                  >
                    {codeVerified
                      ? '인증됨'
                      : sendingCode
                      ? '발송중'
                      : codeSent && countdown > 0
                      ? `재발송 ${formatTime(countdown)}`
                      : '인증 요청'}
                  </button>
                </div>
              </div>

              {/* Verification code input */}
              {codeSent && !codeVerified && (
                <div className="border border-gray-200 p-4 space-y-3 bg-gray-50">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">{form.email}</span>로 인증 코드를 발송했습니다.
                    {countdown > 0 && (
                      <span className="ml-2 text-red-600 font-bold tabular-nums">{formatTime(countdown)}</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.verifyCode}
                      onChange={e => set('verifyCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6자리 코드"
                      className="flex-1 px-4 py-3 border border-gray-200 text-sm text-gray-900 text-center font-mono text-xl tracking-[0.3em] focus:outline-none focus:border-gray-900 bg-white transition-colors"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={verifyCode}
                      disabled={form.verifyCode.length !== 6 || loading}
                      className="px-4 py-3 bg-gray-950 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
                    >
                      {loading ? '확인중' : '확인'}
                    </button>
                  </div>
                </div>
              )}

              {codeVerified && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs font-semibold">이메일 인증 완료</span>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-3 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  비밀번호 <span className="text-red-500">*</span>
                  <span className="text-[10px] text-gray-400 font-normal normal-case ml-1">(8자 이상)</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className={`w-full px-4 py-3 border text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors bg-white ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-gray-900'
                  }`}
                  required
                />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1.5">비밀번호가 일치하지 않습니다</p>
                )}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                가입 시{' '}
                <span className="text-gray-600 cursor-pointer hover:underline">이용약관</span>
                {' '}및{' '}
                <span className="text-gray-600 cursor-pointer hover:underline">개인정보 처리방침</span>
                에 동의하게 됩니다.
              </p>

              <button
                type="submit"
                disabled={loading || !codeVerified}
                className="w-full bg-gray-950 text-white py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center"
              >
                {loading ? <Spinner /> : !codeVerified ? '이메일 인증 후 가입 가능' : '회원가입'}
              </button>
            </form>
          )}

          {/* Social login */}
          <div className="mt-8">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">소셜 계정으로 {mode === 'login' ? '로그인' : '가입'}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {/* Kakao */}
              <button
                onClick={() => handleOAuth('kakao')}
                className="flex flex-col items-center gap-2 py-3.5 bg-[#FEE500] hover:bg-[#F4D400] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#3A1D1D">
                  <path d="M12 3C6.477 3 2 6.477 2 10.727c0 2.648 1.695 4.98 4.273 6.383l-.97 3.545c-.087.32.29.58.57.38l4.175-2.754c.636.085 1.29.128 1.952.128 5.523 0 10-3.477 10-7.682C22 6.477 17.523 3 12 3z" />
                </svg>
                <span className="text-[11px] font-bold text-[#3A1D1D]">카카오</span>
              </button>

              {/* Naver */}
              <button
                onClick={() => handleOAuth('naver')}
                className="flex flex-col items-center gap-2 py-3.5 bg-[#03C75A] hover:bg-[#02B34F] transition-colors"
              >
                <span className="text-white text-base font-black leading-none" style={{ fontFamily: 'sans-serif' }}>N</span>
                <span className="text-[11px] font-bold text-white">네이버</span>
              </button>

              {/* Google */}
              <button
                onClick={() => handleOAuth('google')}
                className="flex flex-col items-center gap-2 py-3.5 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-[11px] font-medium text-gray-600">Google</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            {mode === 'login' ? (
              <>
                계정이 없으신가요?{' '}
                <button onClick={() => switchMode('signup')} className="text-gray-700 font-semibold hover:underline">
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <button onClick={() => switchMode('login')} className="text-gray-700 font-semibold hover:underline">
                  로그인
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      처리중...
    </span>
  );
}
