'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { History, Search, ShieldAlert, CheckCircle2, AlertTriangle, Info, Clock, RefreshCw } from 'lucide-react';

export default function AdminLogsPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const logsList = [
    { id: 'LOG-1092', time: '11:32 ព្រឹក', user: 'kruadmin041030', action: 'ចូលប្រើប្រព័ន្ធ', type: 'info', ip: '192.168.1.45', status: 'ជោគជ័យ' },
    { id: 'LOG-1091', time: '11:28 ព្រឹក', user: 'sysadmin_porieng', action: 'កែប្រែការកំណត់ Role RBAC', type: 'warn', ip: '192.168.1.10', status: 'បានកត់ត្រា' },
    { id: 'LOG-1090', time: '10:15 ព្រឹក', user: 'principal_porieng', action: 'ផ្សព្វផ្សាយសេចក្តីជូនដំណឹងថ្មី', type: 'info', ip: '192.168.1.22', status: 'ជោគជ័យ' },
    { id: 'LOG-1089', time: '09:50 ព្រឹក', user: 'sambath_math', action: 'បញ្ចូលពិន្ទុឆមាសទី 1 ថ្នាក់ 11 ខ', type: 'info', ip: '192.168.1.50', status: 'ជោគជ័យ' },
    { id: 'LOG-1088', time: '09:12 ព្រឹក', user: 'unknown_guest', action: 'ព្យាយាមចូលប្រើដោយគ្មានសិទ្ធិ', type: 'error', ip: '45.112.33.19', status: 'ត្រូវបានបដិសេធ' },
    { id: 'LOG-1087', time: '08:30 ព្រឹក', user: 'reasmey_kh', action: 'កត់ត្រាវត្តមានសិស្សថ្នាក់ 10 គ', type: 'info', ip: '192.168.1.61', status: 'ជោគជ័យ' },
  ];

  const filteredLogs = logsList.filter(l => {
    const matchesSearch = l.user.toLowerCase().includes(searchQuery.toLowerCase()) || l.action.toLowerCase().includes(searchQuery.toLowerCase()) || l.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || l.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            កំណត់ហេតុប្រព័ន្ធ & តាមដានសន្តិសុខ
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>Audit Trail & Security Monitoring៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Active Security Logs
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-xs">
            <History className="w-4 h-4 text-[#FFCF59]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">កំណត់ហេតុទាំងអស់</option>
              <option value="info">ព័ត៌មានទូទៅ</option>
              <option value="warn">ការប្រុងប្រយ័ត្ន</option>
              <option value="error">ការព្រមានសន្តិសុខ (Error/Denied)</option>
            </select>
          </div>

          {/* Search Pill */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកកំណត់ហេតុ ឬ IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => alert('ទិន្នន័យកំណត់ហេតុត្រូវបានអាប់ដេតថ្មីបំផុត!')}
            className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="អាប់ដេតទិន្នន័យ"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Logs Table — Clean White Card */}
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#155EEF]" />
            <span>កត់ត្រាសកម្មភាពថ្មីៗក្នុងប្រព័ន្ធ ({filteredLogs.length} កំណត់ហេតុ)</span>
          </h3>
          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ប្រព័ន្ធការពារសកម្ម</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-4 px-6 w-24">លេខកូដ</th>
                <th className="py-4 px-6">ពេលវេលា</th>
                <th className="py-4 px-6 font-mono">គណនី</th>
                <th className="py-4 px-6 min-w-[220px]">សកម្មភាពដែលបានធ្វើ</th>
                <th className="py-4 px-6 font-mono">អាសយដ្ឋាន IP</th>
                <th className="py-4 px-6 text-center">កម្រិត</th>
                <th className="py-4 px-6 text-right">លទ្ធផល</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {filteredLogs.map((l) => {
                let badge = <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#155EEF] text-xs font-bold border border-blue-200 flex items-center gap-1 w-fit mx-auto"><Info className="w-3 h-3" /> Info</span>;
                if (l.type === 'warn') badge = <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1 w-fit mx-auto"><AlertTriangle className="w-3 h-3" /> Warn</span>;
                else if (l.type === 'error') badge = <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-extrabold border border-rose-200 flex items-center gap-1 w-fit mx-auto"><ShieldAlert className="w-3 h-3" /> Alert</span>;

                return (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-extrabold text-slate-400">{l.id}</td>
                    <td className="py-4 px-6 text-xs text-slate-600 font-bold">{l.time}</td>
                    <td className="py-4 px-6 font-mono text-xs font-extrabold text-slate-800">@{l.user}</td>
                    <td className="py-4 px-6 font-bold text-slate-800">{l.action}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{l.ip}</td>
                    <td className="py-4 px-6 text-center">{badge}</td>
                    <td className="py-4 px-6 text-right font-extrabold">
                      <span className={l.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}>
                        {l.status}
                      </span>
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
