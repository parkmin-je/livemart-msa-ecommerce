'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:8085';

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
      const token = localStorage.getItem('token') || '';
      if (!token) {
        toast.error('로그인이 필요합니다. 관리자 계정으로 로그인해주세요.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('사용자가 비활성화되었습니다.');
      fetchUsers();
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !searchTerm || u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    sellers: users.filter(u => u.role === 'SELLER').length,
    customers: users.filter(u => u.role === 'CUSTOMER' || u.role === 'USER').length,
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-700',
      SELLER: 'bg-purple-100 text-purple-700',
      CUSTOMER: 'bg-blue-100 text-blue-700',
      USER: 'bg-blue-100 text-blue-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config[role] || 'bg-gray-100 text-gray-700'}`}>{role}</span>;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/admin" className="text-sm text-gray-700 hover:text-blue-600">관리자</a>
              <a href="/admin/orders" className="text-sm text-gray-700 hover:text-blue-600">주문관리</a>
              <span className="text-sm font-medium text-blue-600">유저관리</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">유저 관리</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">전체 유저</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">관리자</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.admins}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">판매자</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.sellers}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-sm text-gray-500">일반 회원</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.customers}</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input type="text" placeholder="이름 또는 이메일로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none">
            <option value="">전체 역할</option>
            <option value="ADMIN">관리자</option>
            <option value="SELLER">판매자</option>
            <option value="CUSTOMER">일반 회원</option>
          </select>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">유저가 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전화번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">#{user.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.phoneNumber || '-'}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="CUSTOMER">일반</option>
                          <option value="SELLER">판매자</option>
                          <option value="ADMIN">관리자</option>
                        </select>
                        <button onClick={() => handleDeactivate(user.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">비활성화</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
