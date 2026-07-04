'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Settings, Save, CheckCircle2, Shield, KeyRound, Server, Lock, Globe } from 'lucide-react';

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [dbUrl, setDbUrl] = useState('https://xyza-supabase-project.supabase.co');
  const [rlsEnabled, setRlsEnabled] = useState(true);
  const [dbPoolSize, setDbPoolSize] = useState('25');
  const [maxSessions, setMaxSessions] = useState('30');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none max-w-4xl mx-auto">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            ការកំណត់ប្រព័ន្ធ & System Configuration
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>គ្រប់គ្រងប៉ារ៉ាម៉ែត្រប្រព័ន្ធ៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Environment Variables & Security
            </span>
          </p>
        </div>
      </header>

      {saved && (
        <div className="p-4 rounded-[20px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>ការកំណត់ប្រព័ន្ធត្រូវបានរក្សាទុកដោយជោគជ័យ!</span>
        </div>
      )}

      {/* Settings Form Card */}
      <form onSubmit={handleSave} className="bg-white p-8 rounded-[24px] border border-slate-100/80 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">ការកំណត់បច្ចេកទេស (System Parameters)</h3>
            <p className="text-xs text-slate-500 font-medium">កែប្រែចំណុចភ្ជាប់ Supabase Database និងសុវត្ថិភាព RLS</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5 flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-[#155EEF]" /> Supabase URL Endpoint៖
            </label>
            <input
              type="text"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-mono font-bold focus:outline-none focus:border-[#155EEF] bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-[#155EEF]" /> DB Pool Connections៖
              </label>
              <select
                value={dbPoolSize}
                onChange={(e) => setDbPoolSize(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-[#155EEF] cursor-pointer"
              >
                <option value="15">15 Connections (Default)</option>
                <option value="25">25 Connections (Recommended)</option>
                <option value="50">50 Connections (High Traffic)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Session Timeout (នាទី)៖
              </label>
              <input
                type="number"
                value={maxSessions}
                onChange={(e) => setMaxSessions(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-[#155EEF]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div>
                <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>បើកដំណើរការ Row Level Security (RLS)</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">ការពារទិន្នន័យមិនឱ្យអ្នកប្រើប្រាស់ដែលគ្មានសិទ្ធិចូលទាញយកបាន</p>
              </div>
              <input
                type="checkbox"
                checked={rlsEnabled}
                onChange={(e) => setRlsEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#155EEF] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 border border-rose-200/60">
              <div>
                <div className="text-sm font-extrabold text-rose-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-rose-600" />
                  <span>ថែទាំប្រព័ន្ធ (Maintenance Mode)</span>
                </div>
                <p className="text-xs text-rose-600/80 mt-0.5">បិទមិនឱ្យគ្រូបង្រៀនចូលប្រើប្រាស់បណ្តោះអាសន្ននៅពេលអាប់ដេតប្រព័ន្ធ</p>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-5 h-5 accent-rose-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-8 py-3 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>រក្សាទុកការកំណត់ប្រព័ន្ធ</span>
          </button>
        </div>
      </form>
    </div>
  );
}
