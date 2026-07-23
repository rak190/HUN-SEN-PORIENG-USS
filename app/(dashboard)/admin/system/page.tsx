'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Database, Server, ShieldAlert, CheckCircle2, AlertTriangle, 
  History, Download, RefreshCw, UploadCloud, FileText, Search
} from 'lucide-react';

export default function SystemHealthPage() {
  const { profile } = useAuth();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      alert('ការបម្រុងទុកទិន្នន័យបានជោគជ័យ (Database Backup Successful)!');
    }, 2000);
  };

  const logsList = [
    { id: 'LOG-1092', time: '11:32 ព្រឹក', user: 'kruadmin041030', action: 'ចូលប្រើប្រព័ន្ធ', type: 'info', status: 'ជោគជ័យ' },
    { id: 'LOG-1091', time: '11:28 ព្រឹក', user: 'sysadmin_porieng', action: 'កែប្រែការកំណត់ Role', type: 'warn', status: 'បានកត់ត្រា' },
    { id: 'LOG-1088', time: '09:12 ព្រឹក', user: 'unknown_guest', action: 'ព្យាយាមចូលប្រើប្រព័ន្ធ', type: 'error', status: 'បដិសេធ' },
  ];

  const filteredLogs = logsList.filter(l => 
    l.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            សុខភាពប្រព័ន្ធ និងទិន្នន័យ
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            System Health & Data Backup (គ្រប់គ្រងបច្ចេកទេសប្រព័ន្ធ GIEP)
          </p>
        </div>
        
        <div className="flex gap-2.5">
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="px-5 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-full text-xs shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center gap-2"
          >
            {isBackingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            <span>{isBackingUp ? 'កំពុងបម្រុងទុក...' : 'បម្រុងទុកទិន្នន័យថ្មី (Backup Now)'}</span>
          </button>
        </div>
      </header>

      {/* Grid Layout (Logs vs Backup Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Backup & System Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">ស្ថានភាពម៉ាស៊ីនមេ</h3>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">All Systems Operational</span>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-50">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="text-[#64748B]">Database Uptime</span>
                <span>99.99%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="text-[#64748B]">Storage Used</span>
                <span>450 MB / 5 GB</span>
              </div>
            </div>
          </div>

          <div className="bg-[#FFCF59] p-6 rounded-[24px] shadow-sm border border-yellow-400/30">
            <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" /> ប្រវត្តិបម្រុងទុក (Backups)
            </h3>
            <div className="space-y-3">
              <div className="bg-white/60 p-3 rounded-xl flex items-center justify-between hover:bg-white/90 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-900" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">backup_2026_07_20.sql</div>
                    <div className="text-[10px] text-yellow-900/70 font-semibold">45 MB • Auto-Backup</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-700 hover:text-[#155EEF]" />
              </div>
              <div className="bg-white/60 p-3 rounded-xl flex items-center justify-between hover:bg-white/90 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-900" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">backup_2026_07_13.sql</div>
                    <div className="text-[10px] text-yellow-900/70 font-semibold">42 MB • Manual</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-700 hover:text-[#155EEF]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: System Logs */}
        <div className="lg:col-span-8 bg-white rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-[#155EEF]" />
                កំណត់ហេតុសុវត្ថិភាព (Security Logs)
              </h3>
              <p className="text-[11px] text-[#64748B] font-medium">តាមដានសកម្មភាពចូលប្រើប្រព័ន្ធចុងក្រោយ</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ស្វែងរកកំណត់ហេតុ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
              />
            </div>
          </div>
          
          <div className="p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider rounded-xl">
                  <th className="py-3 px-4 rounded-tl-lg">ពេលវេលា</th>
                  <th className="py-3 px-4">គណនី</th>
                  <th className="py-3 px-4">សកម្មភាព</th>
                  <th className="py-3 px-4 text-center rounded-tr-lg">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="text-sm font-semibold divide-y divide-slate-50">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-600 font-bold">{l.time}</td>
                    <td className="py-3 px-4 font-mono text-xs font-extrabold text-slate-800">@{l.user}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{l.action}</td>
                    <td className="py-3 px-4 text-center">
                      {l.type === 'error' ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded border border-rose-100">បដិសេធ</span>
                      ) : l.type === 'warn' ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded border border-amber-100">ប្រុងប្រយ័ត្ន</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded border border-emerald-100">ជោគជ័យ</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs font-bold text-slate-400">មិនមានកំណត់ហេតុដែលត្រូវនឹងការស្វែងរកទេ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
