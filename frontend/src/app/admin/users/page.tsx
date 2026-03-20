'use client';

import { useState, useEffect } from 'react';
import { GlobalNav } from '@/components/GlobalNav';
import toast from 'react-hot-toast';

const API_BASE = '';

interface User {
  id: number;
  email: string;
  name: string;
  phoneNumber?: string;
  role: string;
  createdAt: string;
  active?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.content || []);
      } else if (res.status === 401) {
        toast.error('세션이 만료됐습니다. 다시 로그인해주세요.');
        window.location.href = '/auth';
      } else if (res.status === 403) {
        toast.error('관리자 권한이 없습니다. ADMIN 계정으로 로그인해주세요.');
      } else {
        toast.error('유저 목록을 불러오지 못했습니다.');
      }
    } catch {
      toast.error('서버에 연결할 수 없습니다.');
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/role`, {
        method: 'PUT',
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success('역할이 변경되었습니다.');
        fetchUsers();
      } else {
        toast.error('역할 변경에 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
  };

  const handleDeactivate = async (userId: number) => {
    if (!confirm('이 사용자를 비활성화하시겠습니까?')) return;
    try {
      await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      toast.success('사용자가 비활성화되었습니다.');
      fetchUsers();
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !searchTerm || u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter || (roleFilter === 'CUSTOMER' && u.role === 'USER');
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    sellers: users.filter(u => u.role === 'SELLER').length,
    customers: users.filter(u => u.role === 'USER').length,
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, string> = {
      ADMIN: 'bg-red-50 text-red-700 border border-red-200',
      SELLER: 'bg-purple-50 text-purple-700 border border-purple-200',
      CUSTOMER: 'bg-blue-50 text-blue-700 border border-blue-200',
      USER: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${config[role] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav />

      {/* Admin header bar */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/admin" className="text-xs font-semibold tracking-widest text-gray-400 uppercase hover:text-white transition-colors">Admin</a>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-300">사용자 관리</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-14 md:pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>
          <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            대시보드
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 사용자', value: stats.total, color: 'text-gray-900' },
            { label: '관리자', value: stats.admins, color: 'text-red-600' },
            { label: '판매자', value: stats.sellers, color: 'text-purple-600' },
            { label: '일반 회원', value: stats.customers, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 p-5">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500 bg-white"
          >
            <option value="">전체 역할</option>
            <option value="ADMIN">관리자</option>
            <option value="SELLER">판매자</option>
            <option value="CUSTOMER">일반 회원</option>
          </select>
        </div>

        {/* User Table */}
        <div className="bg-white border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">사용자가 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이메일</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">전화번호</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">역할</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">가입일</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-400 font-mono">#{user.id}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{user.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{user.phoneNumber || '-'}</td>
                    <td className="px-5 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">활성</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 items-center">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-gray-500 bg-white"
                        >
                          <option value="USER">일반</option>
                          <option value="SELLER">판매자</option>
                          <option value="ADMIN">관리자</option>
                        </select>
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          비활성화
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
    </div>
  );
}
