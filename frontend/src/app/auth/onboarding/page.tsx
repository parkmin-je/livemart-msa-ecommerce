'use client';

import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8085';

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth';
      return;
    }
    const savedName = localStorage.getItem('userName');
    if (savedName) setName(savedName);
  }, []);

  // 010-XXXX-XXXX 형식 자동 포맷
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      setError('서비스 이용약관에 동의해주세요.');
      return;
    }
    const rawPhone = phone.replace(/-/g, '');
    if (rawPhone.length < 10 || !rawPhone.startsWith('01')) {
      setError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phoneNumber: phone }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name) localStorage.setItem('userName', data.name);
        // 온보딩 완료 후 role 재확인 저장 (token에서 파싱)
        try {
          const tok = localStorage.getItem('token') || '';
          const payload = JSON.parse(atob(tok.split('.')[1]));
          localStorage.setItem('userRole', payload.role || 'USER');
        } catch { /* ignore */ }
        window.location.href = '/';
      } else if (res.status === 401) {
        window.location.href = '/auth';
      } else {
        setError('정보 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch {
      setError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }

    setLoading(false);
  };

  const handleSkip = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* 로고 */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block mb-4">
            <span className="text-3xl font-black tracking-tight">
              <span className="text-red-600">Live</span>
              <span className="text-gray-900">Mart</span>
            </span>
          </a>
          {/* 진행 단계 표시 */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-8 h-1.5 rounded-full bg-gray-200" />
            <div className="w-8 h-1.5 rounded-full bg-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">추가 정보 입력</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            원활한 쇼핑을 위해 아래 정보를 입력해주세요
          </p>
        </div>

        {/* 폼 카드 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5"
        >
          {/* 이름 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              required
            />
          </div>

          {/* 휴대폰 번호 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              휴대폰 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="010-0000-0000"
              maxLength={13}
              inputMode="numeric"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              required
            />
            <p className="text-xs text-gray-400 mt-1">배송지 확인 및 본인 인증에 사용됩니다</p>
          </div>

          {/* 약관 동의 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">약관 동의</p>

            {/* 전체 동의 */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeTerms && agreeMarketing}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  setAgreeMarketing(e.target.checked);
                }}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-800 group-hover:text-red-600 transition-colors">
                전체 동의
              </span>
            </label>

            <div className="border-t border-gray-200 pt-3 space-y-2.5">
              {/* 필수 약관 */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600">
                  <span className="text-red-500 font-medium">[필수] </span>
                  서비스 이용약관 및 개인정보처리방침 동의
                </span>
              </label>

              {/* 선택 약관 */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeMarketing}
                  onChange={(e) => setAgreeMarketing(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600">
                  <span className="text-gray-400">[선택] </span>
                  마케팅 정보 수신 동의 (이벤트·할인·혜택 안내)
                </span>
              </label>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 완료 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                저장 중...
              </span>
            ) : (
              'LiveMart 시작하기 →'
            )}
          </button>

          {/* 나중에 하기 */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            나중에 입력할게요
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          입력하신 정보는 안전하게 보호됩니다 🔒
        </p>
      </div>
    </div>
  );
}
