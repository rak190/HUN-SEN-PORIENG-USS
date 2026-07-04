'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UserCog, Search, Plus, CheckCircle2, Shield, UserCheck, Edit2, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const usersList = [
    { id: 'USR-01', username: 'kruadmin041030', name: 'លោកគ្រូ/អ្នកគ្រូ សុខា', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '3 នាទីមុន' },
    { id: 'USR-02', username: 'principal_porieng', name: 'នាយកសាលា សុខា', role: 'principal', roleKh: 'នាយកសាលា', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '1 ម៉ោងមុន' },
    { id: 'USR-03', username: 'sysadmin_porieng', name: 'អ្នកគ្រប់គ្រង សុខា', role: 'admin', roleKh: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: 'ឥឡូវនេះ' },
    { id: 'USR-04', username: 'sambath_math', name: 'លោកគ្រូ សម្បត្តិ', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: 'ម្សិលមិញ' },
    { id: 'USR-05', username: 'reasmey_kh', name: 'អ្នកគ្រូ ច័ន្ទរស្មី', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '2 ម៉ោងមុន' },
    { id: 'USR-06', username: 'bunthoeun_his', name: 'លោកគ្រូ ប៊ុនធឿន', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '3 ថ្ងៃមុន' },
  ];

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            គ្រប់គ្រងគណនី និងតួនាទីអ្នកប្រើប្រាស់
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>ប្រព័ន្ធគ្រប់គ្រងសិទ្ធិ៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Role-Based Access Control (RBAC)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-xs">
            <Shield className="w-4 h-4 text-[#FFCF59]" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">តួនាទីទាំងអស់ (All Roles)</option>
              <option value="teacher">គ្រូបន្ទុកថ្នាក់ (Teacher)</option>
              <option value="principal">នាយកសាលា (Principal)</option>
              <option value="admin">អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)</option>
            </select>
          </div>

          {/* Search Pill */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកគណនី ឬឈ្មោះ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs"
            />
          </div>

          {/* New User Button */}
          <button
            onClick={() => alert('មុខងារបង្កើតគណនីថ្មីកំពុងដំណើរការ!')}
            className="px-5 py-2.5 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតគណនីថ្មី</span>
          </button>
        </div>
      </header>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">គណនីសរុប</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{usersList.length} គណនី</div>
        </div>
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">គ្រូបង្រៀន (Teacher)</div>
          <div className="text-2xl font-black text-[#155EEF] mt-1">
            {usersList.filter(u => u.role === 'teacher').length} នាក់
          </div>
        </div>
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">នាយកសាលា (Principal)</div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {usersList.filter(u => u.role === 'principal').length} នាក់
          </div>
        </div>
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">អ្នកគ្រប់គ្រង (Admin)</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {usersList.filter(u => u.role === 'admin').length} នាក់
          </div>
        </div>
      </div>

      {/* Users Table — Clean White Card */}
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#155EEF]" />
            <span>បញ្ជីគណនីអ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ ({filteredUsers.length} គណនី)</span>
          </h3>
          <span className="text-xs font-extrabold text-[#155EEF] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            សុវត្ថិភាព RLS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-4 px-6 w-16 text-center">ល.រ</th>
                <th className="py-4 px-6">អត្តលេខ</th>
                <th className="py-4 px-6 min-w-[180px]">ឈ្មោះពេញ (Full Name)</th>
                <th className="py-4 px-6 font-mono">ឈ្មោះគណនី (Username)</th>
                <th className="py-4 px-6 text-center">តួនាទី (Role)</th>
                <th className="py-4 px-6 text-center">កូដសាលា</th>
                <th className="py-4 px-6 text-center">ចូលចុងក្រោយ</th>
                <th className="py-4 px-6 text-center">ស្ថានភាព</th>
                <th className="py-4 px-6 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {filteredUsers.map((u, idx) => {
                let roleStyle = 'bg-blue-50 text-[#155EEF] border-blue-200';
                if (u.role === 'principal') roleStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                else if (u.role === 'admin') roleStyle = 'bg-amber-50 text-amber-700 border-amber-200 font-black';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{u.id}</td>
                    <td className="py-4 px-6 font-extrabold text-slate-800">{u.name}</td>
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-600">@{u.username}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${roleStyle}`}>
                        {u.roleKh}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-xs text-slate-500">{u.school}</td>
                    <td className="py-4 px-6 text-center text-xs text-slate-500">{u.lastLogin}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{u.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button title="កែប្រែ" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#155EEF] cursor-pointer">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button title="លុប" className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
