'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Database, Download, Upload, ShieldCheck, CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';

export default function AdminBackupPage() {
  const { profile } = useAuth();
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackupNow = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      alert('ការបម្រុងទុកទិន្នន័យ (Database Backup) បានបញ្ចប់ដោយជោគជ័យ! ឯកសារ SQL Dump ត្រូវបានបង្កើត។');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            បម្រុងទុកទិន្នន័យ & ស្តារប្រព័ន្ធឡើងវិញ
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>Database Backup & Recovery៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              PostgreSQL Automated Snapshots
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleBackupNow}
            disabled={isBackingUp}
            className="px-6 py-2.5 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
            <span>{isBackingUp ? 'កំពុងបម្រុងទុកទិន្នន័យ...' : 'បង្កើត Backup ឥឡូវនេះ (SQL Dump)'}</span>
          </button>
        </div>
      </header>

      {/* Backup Status Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase">ស្ថានភាព Backup ចុងក្រោយ</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> ជោគជ័យ</span>
          </div>
          <div className="text-2xl font-black text-slate-800">ថ្ងៃនេះ, 06:00 ព្រឹក</div>
          <p className="text-xs font-semibold text-slate-500">ស្វ័យប្រវត្តិប្រចាំថ្ងៃ (Daily Snapshot)</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase">ទំហំឯកសារសរុប (Database Size)</span>
            <span className="p-2 rounded-xl bg-blue-50 text-[#155EEF] font-bold text-xs">បង្រួម Gzip</span>
          </div>
          <div className="text-2xl font-black text-[#155EEF]">24.8 MB</div>
          <p className="text-xs font-semibold text-slate-500">រួមបញ្ចូលតារាងសិស្ស គ្រូ និងពិន្ទុទាំងអស់</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase">ទីតាំងផ្ទុកទិន្នន័យ (Storage Location)</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 font-bold text-xs">Supabase Cloud</span>
          </div>
          <div className="text-2xl font-black text-slate-800">AP-Southeast-1</div>
          <p className="text-xs font-semibold text-slate-500">ម៉ាស៊ីនមេដែលមានសុវត្ថិភាពខ្ពស់ (Singapore)</p>
        </div>
      </div>

      {/* Recent Backup Snapshots Table */}
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#155EEF]" />
            <span>ប្រវត្តិឯកសារបម្រុងទុកទិន្នន័យ (Recent Snapshots)</span>
          </h3>
          <span className="text-xs font-extrabold text-[#155EEF] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            រក្សាទុក 30 ថ្ងៃចុងក្រោយ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-4 px-6">ឈ្មោះឯកសារ Backup</th>
                <th className="py-4 px-6">កាលបរិច្ឆេទបង្កើត</th>
                <th className="py-4 px-6">ប្រភេទបម្រុងទុក</th>
                <th className="py-4 px-6 text-center">ទំហំឯកសារ</th>
                <th className="py-4 px-6 text-center">ស្ថានភាព</th>
                <th className="py-4 px-6 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {[
                { name: 'db_porieng_backup_2026_07_02.sql.gz', date: '02 កក្កដា 2026, 06:00 ព្រឹក', type: 'ស្វ័យប្រវត្តិ (Auto)', size: '24.8 MB', status: 'ជោគជ័យ' },
                { name: 'db_porieng_backup_2026_07_01.sql.gz', date: '01 កក្កដា 2026, 06:00 ព្រឹក', type: 'ស្វ័យប្រវត្តិ (Auto)', size: '24.5 MB', status: 'ជោគជ័យ' },
                { name: 'db_porieng_backup_manual_pre_exam.sql.gz', date: '30 មិថុនា 2026, 05:15 ល្ងាច', type: 'ដោយដៃ (Manual)', size: '24.2 MB', status: 'ជោគជ័យ' },
                { name: 'db_porieng_backup_2026_06_30.sql.gz', date: '30 មិថុនា 2026, 06:00 ព្រឹក', type: 'ស្វ័យប្រវត្តិ (Auto)', size: '24.1 MB', status: 'ជោគជ័យ' },
              ].map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-mono font-extrabold text-[#155EEF]">{b.name}</td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-bold">{b.date}</td>
                  <td className="py-4 px-6 font-bold text-slate-700">{b.type}</td>
                  <td className="py-4 px-6 text-center font-mono font-bold text-slate-700">{b.size}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{b.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => alert(`កំពុងទាញយកឯកសារ៖ ${b.name}`)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#155EEF] font-extrabold text-xs transition-all flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ទាញយក</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
