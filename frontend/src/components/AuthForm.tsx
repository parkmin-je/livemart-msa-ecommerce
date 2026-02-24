'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', name: '' });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다'); return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password }),
        });
        if (!res.ok) throw new Error('로그인 실패');
        const data = await res.json();
        localStorage.setItem('token', data.accessToken || data.token || '');
        localStorage.setItem('refreshToken', data.refreshToken || '');
        localStorage.setItem('userId', String(data.userId || data.id || ''));
        localStorage.setItem('userName', data.name || data.username || form.username);
        toast.success('로그인되었습니다!');
        router.push('/');
        window.location.reload();
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, email: form.email, password: form.password, name: form.name || form.username }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || '회원가입 실패');
        }
        toast.success('회원가입 완료! 로그인해주세요.');
        setMode('login');
        setForm(f => ({ ...f, password: '', confirmPassword: '' }));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="text-4xl font-black tracking-tight">
              <span className="text-red-600">Live</span><span className="text-gray-900">Mart</span>
            </span>
          </a>
          <p className="text-gray-500 mt-2 text-sm">빠른배송 · 최저가 · 안전결제</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 탭 */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-red-600 border-b-2 border-red-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'signup' ? 'text-red-600 border-b-2 border-red-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="form-label">이름</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="홍길동" className="form-input" />
              </div>
            )}
            <div>
              <label className="form-label">아이디</label>
              <input type="text" value={form.username} onChange={e => set('username', e.target.value)}
                placeholder="아이디를 입력하세요" className="form-input" required />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="form-label">이메일</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="example@email.com" className="form-input" />
              </div>
            )}
            <div>
              <label className="form-label">비밀번호</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="비밀번호를 입력하세요" className="form-input" required />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="form-label">비밀번호 확인</label>
                <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요" className="form-input" required />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" className="accent-red-600" /> 자동 로그인
                </label>
                <button type="button" className="text-red-600 hover:underline">비밀번호 찾기</button>
              </div>
            )}

            {mode === 'signup' && (
              <p className="text-xs text-gray-400">
                가입 시 LiveMart의 <span className="text-red-500 cursor-pointer hover:underline">이용약관</span> 및{' '}
                <span className="text-red-500 cursor-pointer hover:underline">개인정보 처리방침</span>에 동의하게 됩니다.
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 text-base font-bold disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  처리중...
                </span>
              ) : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 소셜 로그인 */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">또는</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-yellow-50 hover:border-yellow-300 transition-colors font-medium">
                <span className="text-base">💛</span> 카카오
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:border-green-300 transition-colors font-medium">
                <span className="text-base">🟢</span> 네이버
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          {mode === 'login' ? (
            <>계정이 없으신가요? <button onClick={() => setMode('signup')} className="text-red-600 font-semibold hover:underline">회원가입</button></>
          ) : (
            <>이미 계정이 있으신가요? <button onClick={() => setMode('login')} className="text-red-600 font-semibold hover:underline">로그인</button></>
          )}
        </p>
      </div>
    </div>
  );
}
