'use client';

import { useState } from 'react';
import { authApi } from '@/api/productApi';
import toast from 'react-hot-toast';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    name: '',
    phoneNumber: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(loginData.email, loginData.password);

      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      toast.success('로그인 성공! 환영합니다.');

      const profile = await authApi.getMyProfile();
      localStorage.setItem('userId', profile.id);
      localStorage.setItem('userName', profile.name);

      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Login failed:', error);
      toast.error(error.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupData.password.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (signupData.name.length < 2 || signupData.name.length > 50) {
      toast.error('이름은 2자 이상 50자 이하여야 합니다.');
      return;
    }

    setLoading(true);

    try {
      await authApi.signup(signupData);

      toast.success('회원가입이 완료되었습니다! 로그인해주세요.');

      setMode('login');
      setLoginData({
        email: signupData.email,
        password: '',
      });
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Signup failed:', error);
      toast.error(error.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'kakao' | 'naver' | 'google') => {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/${provider}`;
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Tab Switcher */}
        <div className="flex mb-6 border-b">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              mode === 'login'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              mode === 'signup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="example@livemart.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="8자 이상 입력"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            {/* Social Login */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">간편 로그인</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('kakao')}
                className="w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: '#FEE500', color: '#191919' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18l-.93 3.44c-.08.3.26.54.52.37l4.12-2.74c.21.02.43.03.65.03 4.42 0 8-2.79 8-6.28S13.42 1 9 1z" fill="#191919"/></svg>
                카카오 로그인
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('naver')}
                className="w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-white"
                style={{ backgroundColor: '#03C75A' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12.13 9.72L5.61 0H0v18h5.87V8.28L12.39 18H18V0h-5.87v9.72z" fill="white"/></svg>
                네이버 로그인
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full py-3 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                Google 로그인
              </button>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일 *</label>
              <input
                type="email"
                required
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="example@livemart.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 *</label>
              <input
                type="password"
                required
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="8자 이상 입력"
              />
              <p className="text-xs text-gray-500 mt-1">최소 8자 이상</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={signupData.name}
                onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
              <input
                type="tel"
                value={signupData.phoneNumber}
                onChange={(e) => setSignupData({ ...signupData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="010-1234-5678 (선택)"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
