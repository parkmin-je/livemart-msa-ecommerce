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
    const styleMap: Record<string, React.CSSProperties> = {
      ADMIN:    { background: 'rgba(232,0,29,0.07)',  color: '#C8001A',       border: '1px solid rgba(232,0,29,0.2)' },
      SELLER:   { background: 'rgba(147,51,234,0.07)', color: 'rgb(109,40,217)', border: '1px solid rgba(147,51,234,0.2)' },
      CUSTOMER: { background: 'rgba(37,99,235,0.07)', color: 'rgb(29,78,216)',  border: '1px solid rgba(37,99,235,0.2)' },
      USER:     { background: 'rgba(37,99,235,0.07)', color: 'rgb(29,78,216)',  border: '1px solid rgba(37,99,235,0.2)' },
    };
    const s = styleMap[role] || { background: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.6)', border: '1px solid rgba(14,14,14,0.12)' };
    return (
      <span className="px-2 py-0.5 text-[11px] font-semibold" style={s}>{role}</span>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}>
      <GlobalNav />

      {/* Admin header bar */}
      <div className="text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/admin" className="text-xs font-semibold tracking-widest uppercase transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>Admin</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>사용자 관리</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-14 md:pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>사용자 관리</h1>
          <a href="/admin" className="text-sm flex items-center gap-1 transition-colors"
            style={{ color: 'rgba(14,14,14,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0E0E0E')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.5)')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            대시보드
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 사용자', value: stats.total,     color: '#0E0E0E' },
            { label: '관리자',     value: stats.admins,    color: '#E8001D' },
            { label: '판매자',     value: stats.sellers,   color: 'rgb(109,40,217)' },
            { label: '일반 회원',  value: stats.customers, color: 'rgb(29,78,216)' },
          ].map(s => (
            <div key={s.label} className="p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <p className="text-xs font-medium" style={{ color: 'rgba(14,14,14,0.5)' }}>{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(14,14,14,0.4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
          >
            <option value="">전체 역할</option>
            <option value="ADMIN">관리자</option>
            <option value="SELLER">판매자</option>
            <option value="CUSTOMER">일반 회원</option>
          </select>
        </div>

        {/* User Table */}
        <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-6 h-6 rounded-full mx-auto" style={{ border: '2px solid rgba(14,14,14,0.1)', borderTopColor: '#E8001D' }} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>사용자가 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F7F6F1', borderBottom: '1px solid rgba(14,14,14,0.08)' }}>
                  {['ID','이름','이메일','전화번호','역할','가입일','상태','액션'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(14,14,14,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(14,14,14,0.05)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F1')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: 'rgba(14,14,14,0.4)' }}>#{user.id}</td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#0E0E0E' }}>{user.name}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'rgba(14,14,14,0.6)' }}>{user.email}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>{user.phoneNumber || '-'}</td>
                    <td className="px-5 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(14,14,14,0.5)' }}>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(16,185,129,0.08)', color: 'rgb(4,120,87)', border: '1px solid rgba(16,185,129,0.2)' }}>활성</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 items-center">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="px-2 py-1 text-xs focus:outline-none"
                          style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
                        >
                          <option value="USER">일반</option>
                          <option value="SELLER">판매자</option>
                          <option value="ADMIN">관리자</option>
                        </select>
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{ background: 'rgba(232,0,29,0.06)', color: '#C8001A', border: '1px solid rgba(232,0,29,0.2)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,0,29,0.12)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,0,29,0.06)')}
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
