'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  GraduationCap,
  Users,
  BarChart3,
  Megaphone,
  ArrowRight,
  Clock,
  ArrowUpRight,
  Building2,
  Search,
  Mic,
  AlertTriangle,
  X
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

export interface PrincipalDashboardClientProps {
  stats: {
    totalStudents: number;
    activeClasses: number;
    teachers: number;
    absentRate: string;
  };
  trendData: any[];
  atRiskStudents: any[];
  activities: any[];
}

export default function PrincipalDashboardClient({
  stats,
  trendData,
  atRiskStudents,
  activities
}: PrincipalDashboardClientProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEwsModal, setShowEwsModal] = useState(false);

  const generateSvgPath = (data: { monthLabel: string; attendancePct: number; gradePct: number }[], key: 'attendancePct' | 'gradePct') => {
    if (!data || data.length === 0) return '';
    const points = data.map((d, i) => {
      const x = i * (500 / (data.length - 1 || 1));
      const y = 100 - d[key];
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };
  
  const attendancePath = generateSvgPath(trendData, 'attendancePct');
  const gradesPath = generateSvgPath(trendData, 'gradePct');

  const quickLinks = [
    { title: 'គ្រូ & បុគ្គលិក', desc: 'គ្រប់គ្រងបញ្ជីគ្រូ និងថ្នាក់បន្ទុក', href: '/principal/staff', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'សិស្សទូទាំងសាលា', desc: 'ពិនិត្យទិន្នន័យ និងស្ថិតិសិស្សានុសិស្ស', href: '/principal/students', icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'របាយការណ៍សាលា', desc: 'វិភាគអត្រាវត្តមាន និងលទ្ធផលសិក្សា', href: '/principal/reports', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'សេចក្តីជូនដំណឹង', desc: 'ផ្សព្វផ្សាយព័ត៌មាន និងសេចក្តីប្រកាស', href: '/principal/announcements', icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'ការកំណត់សាលា', desc: 'កែប្រែព័ត៌មាន និងឆ្នាំសិក្សា', href: '/principal/settings', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            ផ្ទាំងគ្រប់គ្រងនាយកសាលា
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            ស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងសាលា {profile?.school_code === 'Porieng-2026' ? 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង' : profile?.school_code || 'សាលារៀនកម្ពុជា'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {atRiskStudents.length > 0 && (
            <button 
              onClick={() => setShowEwsModal(true)} 
              className="relative p-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-full shadow-sm text-rose-600 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={`${atRiskStudents.length} សិស្សកំពុងប្រឈមហានិភ័យ`}
            >
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-600 text-white flex items-center justify-center text-[8px] font-black rounded-full border border-white">
                {atRiskStudents.length}
              </span>
            </button>
          )}

          <div className="relative flex-1 sm:flex-none sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរក..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100/80 rounded-full py-3 pl-11 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>

          <button
            onClick={() => alert('មុខងារ Voice Search ជាភាសាខ្មែរនឹងរួចរាល់ឆាប់ៗនេះ!')}
            className="bg-[#FFCF59] p-3 rounded-full shadow-sm text-yellow-950 hover:bg-yellow-400 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
            title="ស្វែងរកដោយសំឡេង"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* EWS Modal (Full-Screen Frosted Glass Portal) */}
      <Modal
        isOpen={showEwsModal}
        onClose={() => setShowEwsModal(false)}
        size="2xl"
        headerBg="bg-rose-50/90"
        icon={
          <div className="w-10 h-10 bg-rose-100/80 rounded-2xl flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
        }
        title="សិស្សប្រឈមហានិភ័យទូទាំងសាលា"
        subtitle="Early Warning System (EWS)"
      >
        <div className="p-6 sm:p-8 space-y-4">
          {atRiskStudents.length > 0 ? (
            atRiskStudents.map((student) => (
              <div
                key={student.id}
                className="p-4 border border-slate-100/90 rounded-2xl bg-white shadow-xs hover:border-[#155EEF]/30 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all"
              >
                <div>
                  <h4 className="font-extrabold text-slate-900 flex items-center gap-2">
                    {student.name}
                    {student.severity === 'high' && (
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-full">
                        ធ្ងន់ធ្ងរ
                      </span>
                    )}
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {student.reasons.map((r: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs font-semibold text-slate-600 flex items-start gap-1.5"
                      >
                        <span className="text-rose-500 mt-0.5">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0 w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-xs active:scale-95">
                    ចុះហៅអាណាព្យាបាល
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 font-bold text-sm">
                មិនមានសិស្សប្រឈមហានិភ័យទេក្នុងខែនេះ។
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* 4 Top Stat Cards (Premium Styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        <Link href="/principal/staff" className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">{stats.teachers}</h2>
            <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-slate-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">ចំនួនគ្រូបង្រៀនសរុប</p>
        </Link>

        <Link href="/classes" className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">{stats.activeClasses}</h2>
            <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-slate-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">ចំនួនថ្នាក់រៀនសរុប</p>
        </Link>

        <Link href="/principal/reports" className="bg-emerald-50 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-emerald-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-emerald-700 tracking-tight leading-none">{stats.absentRate}%</h2>
            <div className="w-9 h-9 rounded-full border border-emerald-200 flex items-center justify-center group-hover:bg-emerald-100 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-emerald-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-emerald-600 mt-4">អត្រាអវត្តមានខែនេះ</p>
        </Link>

        <Link href="/principal/students" className="bg-gradient-to-br from-[#155EEF] to-blue-700 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.totalStudents}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">ចំនួនសិស្សានុសិស្សសរុប</p>
        </Link>
      </div>

      {/* Charts Row 1: Trend Line Chart */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">សន្ទស្សន៍សាលារៀនប្រចាំខែ</h3>
              <p className="text-xs text-[#64748B] font-medium mt-1">ប្រៀបធៀបអត្រាវត្តមាន និងលទ្ធផលសិក្សាសរុប</p>
            </div>
            <span className="text-xs font-bold text-[#64748B] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors">
              8 ខែចុងក្រោយ ⌄
            </span>
          </div>

          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-xs font-extrabold text-[#64748B]">វត្តមានសរុប (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#155EEF]" />
              <span className="text-xs font-extrabold text-[#64748B]">ពិន្ទុប្រឡងមធ្យម (%)</span>
            </div>
          </div>

          <div className="flex-1 w-full relative pt-4 min-h-[220px]">
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] font-bold text-[#64748B] pb-6 z-10">
              <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
            </div>
            <div className="w-full h-full pl-10 pb-6 flex items-end relative">
              <div className="absolute top-2 left-10 right-0 border-t border-slate-100" />
              <div className="absolute top-1/4 left-10 right-0 border-t border-slate-100" />
              <div className="absolute top-2/4 left-10 right-0 border-t border-slate-100" />
              <div className="absolute top-3/4 left-10 right-0 border-t border-slate-100" />
              <div className="absolute bottom-6 left-10 right-0 border-t border-slate-100" />
              
              <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 500 100" preserveAspectRatio="none">
                {attendancePath && <path d={attendancePath} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />}
                {gradesPath && <path d={gradesPath} fill="none" stroke="#155EEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />}
              </svg>
            </div>
            <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[11px] font-extrabold text-[#64748B] px-2">
              {trendData.map((d, i) => <span key={i}>{d.monthLabel}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Actions */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h3 className="font-extrabold text-slate-800 text-base">មុខងារគ្រប់គ្រងសាលា</h3>
              <p className="text-[11px] text-[#64748B] font-medium mt-1">ចូលទៅកាន់មុខងារសំខាន់ៗ</p>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 rounded-2xl bg-[#F4F7FE] border border-blue-100/80">
              {quickLinks.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-all shadow-2xs group cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-800 truncate">{item.title}</div>
                      <div className="text-[11px] text-[#64748B] font-medium truncate">{item.desc}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#155EEF] group-hover:text-white text-slate-400 flex items-center justify-center transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-7 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#155EEF]" />
                <span>សកម្មភាពថ្មីៗក្នុងសាលារៀន</span>
              </h3>
              <p className="text-[11px] text-[#64748B] font-medium mt-1">របាយការណ៍បច្ចុប្បន្នភាពចុងក្រោយ</p>
            </div>
            <Link href="/principal/announcements" className="text-xs font-extrabold text-[#155EEF] hover:underline shrink-0">
              មើលទាំងអស់ &rarr;
            </Link>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
            {activities.length > 0 ? activities.map((act) => (
              <div key={act.id} className="p-4 rounded-[18px] bg-slate-50 border border-slate-100 flex items-start gap-4 hover:shadow-sm transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#155EEF] flex items-center justify-center shrink-0 font-bold text-xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-800">{act.action}</div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">ដោយ៖ {act.profiles?.full_name || 'System'}</p>
                  <div className="text-[10px] text-slate-400 font-bold mt-1.5">
                    {new Date(act.created_at).toLocaleString('km-KH')}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-slate-500 font-bold text-sm">មិនមានសកម្មភាពថ្មីៗទេ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
