'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, Mic, AlertTriangle, X, ArrowUpRight, 
  Users, CheckCircle2, ShieldCheck, Database, Server,
  MessageSquare, UserCog, History, ShieldAlert,
  GraduationCap, Building, FileSpreadsheet
} from 'lucide-react';

const MOCK_DASHBOARD_DATA = {
  stats: {
    totalStudents: 1250,
    activeClasses: 45,
    teachers: 52,
    systemHealth: 100,
    trendData: [
      { month: 'Jan', systemUsagePct: 80, giepPct: 70 },
      { month: 'Feb', systemUsagePct: 85, giepPct: 75 },
      { month: 'Mar', systemUsagePct: 90, giepPct: 85 },
      { month: 'Apr', systemUsagePct: 95, giepPct: 92 },
    ]
  },
  atRiskStudents: [
    { id: '1', name: 'សុខ សាន្ត', severity: 'high', reasons: ['អវត្តមាន ៥ ថ្ងៃជាប់គ្នា', 'ពិន្ទុគណិតវិទ្យាធ្លាក់ចុះ'] },
    { id: '2', name: 'ចាន់ វុទ្ធី', severity: 'medium', reasons: ['អវត្តមានគ្មានច្បាប់ញឹកញាប់'] }
  ],
  activities: [
    { id: 'A1', user: 'Sys Admin', action: 'បានបង្កើតគណនីគ្រូថ្មី ៣ នាក់', time: '១ ម៉ោងមុន' },
    { id: 'A2', user: 'អ្នកគ្រូ នារី', action: 'បានបញ្ជូនវត្តមានថ្នាក់ ១០ ខ', time: '២ ម៉ោងមុន' },
    { id: 'A3', user: 'លោកគ្រូ សម្បត្តិ', action: 'បានកត់ត្រាពិន្ទុប្រចាំខែ', time: '៥ ម៉ោងមុន' },
  ]
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEwsModal, setShowEwsModal] = useState(false);

  useEffect(() => {
    // Mock loading delay
    setTimeout(() => {
      setData(MOCK_DASHBOARD_DATA);
    }, 500);
  }, []);

  if (!data) {
    return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យប្រព័ន្ធ...</div>;
  }

  const { stats, activities, atRiskStudents } = data;

  const generateSvgPath = (trendData: any[], key: string) => {
    if (!trendData || trendData.length === 0) return '';
    const points = trendData.map((d, i) => {
      const x = i * (500 / (trendData.length - 1 || 1));
      const y = 100 - d[key];
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };
  
  const systemPath = generateSvgPath(stats.trendData, 'systemUsagePct');
  const giepPath = generateSvgPath(stats.trendData, 'giepPct');

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            សួស្តីលោកគ្រូ ICT, នេះគឺជាស្ថិតិសាលាប្រចាំថ្ងៃ...
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            ទិដ្ឋភាពទូទៅនៃទិន្នន័យ និងប្រតិបត្តិការប្រព័ន្ធសាលា (Admin Dashboard)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> ទាញយករបាយការណ៍សង្ខេប
          </button>
        </div>
      </header>

      {/* 4 Top Stat Cards (Flat Bold Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        <Link href="/admin/students" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.totalStudents}</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">ចំនួនសិស្សសរុប</p>
        </Link>

        <Link href="/admin/classes" className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">{stats.activeClasses}</h2>
            <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-slate-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">ចំនួនថ្នាក់រៀនសរុប</p>
        </Link>

        <Link href="/admin/attendance" className="bg-rose-50 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-rose-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-rose-700 tracking-tight leading-none">5.2%</h2>
            <div className="w-9 h-9 rounded-full border border-rose-200 flex items-center justify-center group-hover:bg-rose-100 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-rose-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-rose-600 mt-4">អត្រាអវត្តមានថ្ងៃនេះ</p>
        </Link>

        <Link href="/admin/teachers" className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.teachers}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">ចំនួនគ្រូបង្រៀន</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800">ការប្រើប្រាស់ប្រព័ន្ធ (System Usage)</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">ទិន្នន័យ ៤ ខែចុងក្រោយ</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-600"></span> ការប្រើប្រាស់ទូទៅ</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> សមកាលកម្ម GIEP</div>
            </div>
          </div>
          
          <div className="h-48 w-full border-b border-l border-slate-200/50 relative">
            {/* SVG Chart Overlay */}
            <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 overflow-visible">
              <path d={systemPath} fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d={giepPath} fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-full border-t border-slate-200/30 border-dashed flex-1"></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-3 text-xs font-bold text-slate-400 px-2">
            {stats.trendData.map((d: any) => <span key={d.month}>{d.month}</span>)}
          </div>
        </div>

        {/* Activity Feed & Urgent Tasks */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-slate-800 text-lg">កិច្ចការបន្ទាន់</h3>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
              ៣ បញ្ហា
            </span>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center group">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">ថ្នាក់មិនទាន់ស្រង់វត្តមាន</h4>
                  <p className="text-xs text-slate-500 mt-1 font-bold">ថ្នាក់ ១០ ខ មិនទាន់បញ្ជូនទិន្នន័យ (ព្រឹក)</p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-[#155EEF] hover:border-[#155EEF]/30 transition-colors shadow-sm">
                  View Details
                </button>
              </div>
              
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center group">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">បញ្ហាសមកាលកម្ម (Sync Error)</h4>
                  <p className="text-xs text-slate-500 mt-1 font-bold">ម៉ាស៊ីនមេ (Server 2) បរាជ័យ</p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-[#155EEF] hover:border-[#155EEF]/30 transition-colors shadow-sm">
                  View Details
                </button>
              </div>
              
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center group">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">គណនីត្រូវបញ្ជាក់</h4>
                  <p className="text-xs text-slate-500 mt-1 font-bold">មានគណនីគ្រូថ្មី ២ នាក់កំពុងរង់ចាំ</p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-[#155EEF] hover:border-[#155EEF]/30 transition-colors shadow-sm">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EWS Modal */}
      {showEwsModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEwsModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-rose-50 rounded-t-[32px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">សិស្សប្រឈមហានិភ័យ</h2>
                  <p className="text-xs font-bold text-rose-600">Early Warning System (EWS)</p>
                </div>
              </div>
              <button onClick={() => setShowEwsModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors cursor-pointer text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
              {atRiskStudents.map((student: any) => (
                <div key={student.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                      {student.name}
                      {student.severity === 'high' && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">ធ្ងន់ធ្ងរ</span>}
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {student.reasons.map((r: string, i: number) => (
                        <li key={i} className="text-xs font-bold text-slate-600 flex items-start gap-1.5">
                          <span className="text-rose-500 mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">
                    <Link href={`/admin/students?id=${student.id}`} className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-black rounded-xl text-xs transition-colors cursor-pointer block text-center">
                      អន្តរាគមន៍ (Intervene)
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
