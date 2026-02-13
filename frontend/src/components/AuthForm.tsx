'use client';

import { useState } from 'react';
import { authApi } from '@/api/productApi';
import toast from 'react-hot-toast';

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

      // Save tokens
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      toast.success(`로그인 성공! 환영합니다.`);

      // Fetch user profile
      const profile = await authApi.getMyProfile();
      localStorage.setItem('userId', profile.id);
      localStorage.setItem('userName', profile.name);

      // Reload page to update auth state
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    if (signupData.password.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    // Validate name
    if (signupData.name.length < 2 || signupData.name.length > 50) {
      toast.error('이름은 2자 이상 50자 이하여야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.signup(signupData);

      toast.success('회원가입이 완료되었습니다! 로그인해주세요.');

      // Switch to login mode
      setMode('login');
      setLoginData({
        email: signupData.email,
        password: '',
      });
    } catch (error: any) {
      console.error('Signup failed:', error);
      toast.error(error.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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

            {/* Test Credentials */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold mb-2">테스트 계정</p>
              <p className="text-xs text-gray-500">Email: test@livemart.com</p>
              <p className="text-xs text-gray-500">Password: test1234</p>
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

        {/* Feature Info */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">🔐 인증 기능</h3>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>✅ JWT 토큰 기반 인증</li>
            <li>✅ Access Token + Refresh Token</li>
            <li>✅ Spring Security + BCrypt</li>
            <li>✅ Redis를 통한 토큰 관리</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
