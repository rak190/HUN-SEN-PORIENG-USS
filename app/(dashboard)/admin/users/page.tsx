'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  UserCog,
  Search,
  Plus,
  CheckCircle2,
  Shield,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Key,
  FileSpreadsheet,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Inbox,
  MoreHorizontal
} from 'lucide-react';
import UserFormModal from './components/UserFormModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import BulkUserModal from './components/BulkUserModal';

export default function AdminUsersPage() {
  const { profile } = useAuth();

  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Table advanced state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsersList(data.users || []);
        setIsDemo(data.isDemo || false);
      } else {
        showToast(data.error || 'កំហុសក្នុងការទាញយកបញ្ជីអ្នកប្រើប្រាស់', 'error');
      }
    } catch (err: any) {
      showToast('មិនអាចតភ្ជាប់ទៅកាន់ Server បានទេ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers([]);
  }, [searchQuery, roleFilter]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Helper to generate initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (user: any) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = async (formData: any) => {
    setActionLoading(true);
    try {
      if (selectedUser) {
        // Edit existing user
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'កំហុសក្នុងការធ្វើបច្ចុប្បន្នភាព');

        setUsersList(prev =>
          prev.map(u => (u.id === selectedUser.id ? { ...u, ...data.user } : u))
        );
        showToast('បានកែប្រែព័ត៌មានគណនីដោយជោគជ័យ!', 'success');
      } else {
        // Create new user
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'កំហុសក្នុងការបង្កើតគណនី');

        setUsersList(prev => [data.user, ...prev]);
        showToast('បានបង្កើតគណនីថ្មីដោយជោគជ័យ!', 'success');
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'កំហុសក្នុងការលុបគណនី');

      setUsersList(prev => prev.filter(u => u.id !== selectedUser.id));
      showToast('បានលុបគណនីដោយជោគជ័យ!', 'success');
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSuccess = (newUsers: any[], summary: { successCount: number; failCount: number }) => {
    setUsersList(prev => [...newUsers, ...prev]);
    showToast(`បានបង្កើត ${summary.successCount} គណនីដោយជោគជ័យ!`, 'success');
  };

  let filteredUsers = usersList.filter(u => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Sorting
  filteredUsers.sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none relative pb-12">
      {/* Toast notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-[120] px-5 py-3.5 rounded-2xl shadow-xl border font-bold text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Demo Warning Banner if Service Role key is missing */}
      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs font-semibold">
          <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-extrabold text-amber-950 mb-0.5">
              របៀបសាកល្បង (Demo Mode) — មិនទាន់ភ្ជាប់ SUPABASE_SERVICE_ROLE_KEY
            </p>
            <p className="text-amber-800 leading-relaxed">
              ប្រព័ន្ធកំពុងដំណើរការលើទិន្នន័យត្រាប់តាម។ ដើម្បីប្រើប្រាស់មុខងារបង្កើត និងលុបគណនីពិតប្រាកដទៅកាន់ Supabase Auth សូមបន្ថែម <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono font-bold">SUPABASE_SERVICE_ROLE_KEY</code> ក្នុងឯកសារ <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono font-bold">.env.local</code> របស់អ្នក។
            </p>
          </div>
        </div>
      )}

      {/* Unified Floating Toolbar */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            គ្រប់គ្រងអ្នកប្រើប្រាស់
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
            ប្រព័ន្ធគ្រប់គ្រងសិទ្ធិដោយ Role-Based Access Control
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#155EEF] transition-colors" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-transparent rounded-xl text-xs font-bold focus:outline-none focus:bg-white focus:border-[#155EEF]/30 focus:ring-4 focus:ring-[#155EEF]/10 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-slate-50/50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-[#155EEF] transition-colors cursor-pointer"
            title="ទាញយកទិន្នន័យឡើងវិញ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#155EEF]' : ''}`} />
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-slate-900/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">នាំចូល (CSV)</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">បង្កើតថ្មី</span>
          </button>
        </div>
      </header>

      {/* Streamlined Quick Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div 
          onClick={() => setRoleFilter('all')}
          className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === 'all' ? 'bg-[#FFCF59] shadow-sm ring-2 ring-yellow-400 ring-offset-2' : 'bg-white border border-slate-200 hover:border-yellow-400'}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${roleFilter === 'all' ? 'bg-yellow-900/10 text-yellow-950' : 'bg-slate-50 text-slate-500'}`}>
            {usersList.length}
          </div>
          <span className={`text-[13px] font-black ${roleFilter === 'all' ? 'text-yellow-950' : 'text-slate-600'}`}>គណនីសរុប</span>
        </div>

        <div 
          onClick={() => setRoleFilter('teacher')}
          className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === 'teacher' ? 'bg-[#FFCF59] shadow-sm ring-2 ring-yellow-400 ring-offset-2' : 'bg-white border border-slate-200 hover:border-yellow-400'}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${roleFilter === 'teacher' ? 'bg-yellow-900/10 text-yellow-950' : 'bg-slate-50 text-slate-500'}`}>
            {usersList.filter(u => u.role === 'teacher').length}
          </div>
          <span className={`text-[13px] font-black ${roleFilter === 'teacher' ? 'text-yellow-950' : 'text-slate-600'}`}>គ្រូបង្រៀន</span>
        </div>

        <div 
          onClick={() => setRoleFilter('principal')}
          className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === 'principal' ? 'bg-[#FFCF59] shadow-sm ring-2 ring-yellow-400 ring-offset-2' : 'bg-white border border-slate-200 hover:border-yellow-400'}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${roleFilter === 'principal' ? 'bg-yellow-900/10 text-yellow-950' : 'bg-slate-50 text-slate-500'}`}>
            {usersList.filter(u => u.role === 'principal').length}
          </div>
          <span className={`text-[13px] font-black ${roleFilter === 'principal' ? 'text-yellow-950' : 'text-slate-600'}`}>នាយកសាលា</span>
        </div>

        <div 
          onClick={() => setRoleFilter('admin')}
          className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === 'admin' ? 'bg-[#155EEF] shadow-sm ring-2 ring-[#155EEF] ring-offset-2' : 'bg-white border border-slate-200 hover:border-blue-400'}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${roleFilter === 'admin' ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-500'}`}>
            {usersList.filter(u => u.role === 'admin').length}
          </div>
          <span className={`text-[13px] font-black ${roleFilter === 'admin' ? 'text-white' : 'text-slate-600'}`}>អ្នកគ្រប់គ្រង</span>
        </div>

        <div 
          onClick={() => setRoleFilter('monitor')}
          className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === 'monitor' ? 'bg-[#FFCF59] shadow-sm ring-2 ring-yellow-400 ring-offset-2' : 'bg-white border border-slate-200 hover:border-yellow-400'}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${roleFilter === 'monitor' ? 'bg-yellow-900/10 text-yellow-950' : 'bg-slate-50 text-slate-500'}`}>
            {usersList.filter(u => u.role === 'monitor').length}
          </div>
          <span className={`text-[13px] font-black ${roleFilter === 'monitor' ? 'text-yellow-950' : 'text-slate-600'}`}>ប្រធានថ្នាក់</span>
        </div>
      </div>

      {/* Premium Users List */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100/80 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100/50 text-[#155EEF] rounded-lg">
              <UserCog className="w-4 h-4" />
            </div>
            <span>បញ្ជីគណនីក្នុងប្រព័ន្ធ ({filteredUsers.length})</span>
          </h3>
          <span className="text-[10px] font-extrabold text-[#155EEF] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-widest">
            Protected by RLS
          </span>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="w-full min-w-[800px] divide-y divide-slate-50">
              {/* Skeleton Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50">
                <div className="col-span-4 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="col-span-3 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="col-span-2 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="col-span-3 h-4 bg-slate-200 rounded animate-pulse" />
              </div>
              {/* Skeleton Rows */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                    <div className="space-y-2 w-full">
                      <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 animate-in fade-in zoom-in duration-300">
              <div className="w-24 h-24 bg-blue-50 text-blue-200 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-white">
                <Inbox className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">រកមិនឃើញគណនីទេ</h3>
              <p className="text-sm font-semibold text-slate-500 max-w-sm text-center mb-6">
                មិនមានទិន្នន័យគណនីដែលត្រូវនឹងការស្វែងរករបស់អ្នកទេ។ សូមសាកល្បងម្ដងទៀត។
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
              >
                ជម្រះតម្រង (Clear Filters)
              </button>
            </div>
          ) : (
            <div className="w-full min-w-[800px] flex flex-col h-full">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white border-b border-slate-100/80 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                <div className="col-span-4 flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-[#155EEF] focus:ring-[#155EEF] cursor-pointer"
                    checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                    onChange={handleSelectAll}
                  />
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer group">
                    គណនី (User)
                    <ArrowDown className={`w-3 h-3 transition-transform ${sortConfig.key === 'name' ? 'text-[#155EEF] opacity-100' : 'opacity-0 group-hover:opacity-50'} ${sortConfig.key === 'name' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="col-span-3 flex justify-center">
                  <button onClick={() => handleSort('role')} className="flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer group">
                    តួនាទី (Role)
                    <ArrowDown className={`w-3 h-3 transition-transform ${sortConfig.key === 'role' ? 'text-[#155EEF] opacity-100' : 'opacity-0 group-hover:opacity-50'} ${sortConfig.key === 'role' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="col-span-2 text-center">កូដសាលា</div>
                <div className="col-span-2 flex justify-center">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer group">
                    ស្ថានភាព
                    <ArrowDown className={`w-3 h-3 transition-transform ${sortConfig.key === 'status' ? 'text-[#155EEF] opacity-100' : 'opacity-0 group-hover:opacity-50'} ${sortConfig.key === 'status' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="col-span-1 text-right">សកម្មភាព</div>
              </div>

              {/* Data Rows */}
              <div className="divide-y divide-slate-50 flex-1">
                {paginatedUsers.map((u, idx) => {
                  let roleColor = 'text-[#155EEF] bg-blue-50 border-blue-100';
                  let avatarBg = 'bg-blue-100 text-blue-700';
                  
                  if (u.role === 'principal') {
                    roleColor = 'text-purple-700 bg-purple-50 border-purple-100';
                    avatarBg = 'bg-purple-100 text-purple-700';
                  } else if (u.role === 'admin') {
                    roleColor = 'text-amber-700 bg-amber-50 border-amber-100';
                    avatarBg = 'bg-amber-100 text-amber-700';
                  } else if (u.role === 'monitor') {
                    roleColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                    avatarBg = 'bg-emerald-100 text-emerald-700';
                  }

                  // Calculate staggering animation delay based on index (up to 10 items)
                  const animDelay = `${(idx % 15) * 40}ms`;

                  return (
                    <div 
                      key={u.id} 
                      className={`grid grid-cols-12 gap-4 px-6 py-4 items-center bg-white transition-colors group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both ${
                        selectedUsers.includes(u.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/60'
                      }`}
                      style={{ animationDelay: animDelay }}
                    >
                      {/* Avatar & Name */}
                      <div className="col-span-4 flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-[#155EEF] focus:ring-[#155EEF] cursor-pointer"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => handleSelectOne(u.id)}
                        />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border border-white shadow-sm ${avatarBg}`}>
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 truncate text-sm">{u.name}</p>
                          <p className="text-xs font-mono text-slate-500 truncate mt-0.5">@{u.username}</p>
                        </div>
                      </div>

                      {/* Role Pill */}
                      <div className="col-span-3 flex justify-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-black border ${roleColor} shadow-sm`}>
                          {u.roleKh || u.role}
                        </span>
                      </div>

                      {/* School Code */}
                      <div className="col-span-2 flex justify-center">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                          {u.school}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 flex justify-center flex-col items-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {u.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium mt-1">
                          {u.lastLogin}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-end relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${activeDropdown === u.id ? 'bg-slate-100 text-[#155EEF]' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeDropdown === u.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in zoom-in-95 duration-200">
                              <button
                                onClick={() => { setActiveDropdown(null); handleOpenEdit(u); }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#155EEF] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> កែប្រែ
                              </button>
                              <button
                                onClick={() => { 
                                  setActiveDropdown(null); 
                                  alert(`Password for ${u.name} has been reset to 123456`);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Key className="w-3.5 h-3.5" /> Reset Pass
                              </button>
                              <div className="h-px w-full bg-slate-50 my-1" />
                              <button
                                onClick={() => { setActiveDropdown(null); handleOpenDelete(u); }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> លុបចេញ
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Pagination Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white mt-auto">
                <p className="text-xs font-semibold text-slate-500">
                  បង្ហាញ <span className="font-bold text-slate-700">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)}</span> ដល់{' '}
                  <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> នៃ{' '}
                  <span className="font-bold text-slate-700">{filteredUsers.length}</span> គណនីសរុប
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === i + 1 
                        ? 'bg-[#155EEF] text-white border-[#155EEF]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveUser}
        initialData={selectedUser}
        loading={actionLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        userName={selectedUser?.name}
        loading={actionLoading}
      />

      <BulkUserModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handleBulkSuccess}
      />
    </div>
  );
}
