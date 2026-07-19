'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchPrincipalDashboardData } from './actions';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  Award,
  CheckCircle2,
  School,
  BarChart3,
  Megaphone,
  ArrowRight,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Building2,
  Search, Mic, AlertTriangle, X
} from 'lucide-react';

export default function PrincipalDashboardPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEwsModal, setShowEwsModal] = useState(false);
  
  const [trendData, setTrendData] = useState<any[]>([
    { monthLabel: 'មករា', attendancePct: 0, gradePct: 0 },
    { monthLabel: 'កុម្ភៈ', attendancePct: 0, gradePct: 0 },
    { monthLabel: 'មីនា', attendancePct: 0, gradePct: 0 },
    { monthLabel: 'មេសា', attendancePct: 0, gradePct: 0 },
    { monthLabel: 'ឧសភា', attendancePct: 0, gradePct: 0 },
    { monthLabel: 'មិថុនា', attendancePct: 0, gradePct: 0 },
    { monthLabel: 'កក្កដា', attendancePct: 0, gradePct: 0 },
    { monthLabel: 'សីហា', attendancePct: 0, gradePct: 0 }
  ]);

  useEffect(() => {
    async function loadLiveData() {
      const data = await fetchPrincipalDashboardData();
      if (data && data.trendData) {
        setTrendData(data.trendData);
      }
    }
    loadLiveData();
  }, []);

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

  const atRiskStudents = [
    { id: 1, name: 'សុខ មករា', severity: 'high', reasons: ['អវត្តមាន ៥ ថ្ងៃជាប់គ្នា', 'ពិន្ទុធ្លាក់ចុះខ្លាំង'] },
    { id: 2, name: 'ចាន់ ស្រីនាថ', severity: 'medium', reasons: ['អវត្តមាន ៣ ថ្ងៃ'] }
  ];

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
                  <h2 className="text-xl font-black text-slate-900">សិស្សប្រឈមហានិភ័យទូទាំងសាលា</h2>
                  <p className="text-xs font-bold text-rose-600">Early Warning System (EWS)</p>
                </div>
              </div>
              <button onClick={() => setShowEwsModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors cursor-pointer text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
              {atRiskStudents.map((student) => (
                <div key={student.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                      {student.name}
                      {student.severity === 'high' && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">ធ្ងន់ធ្ងរ</span>}
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {student.reasons.map((r, i) => (
                        <li key={i} className="text-xs font-bold text-slate-600 flex items-start gap-1.5">
                          <span className="text-rose-500 mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-black rounded-xl text-xs transition-colors cursor-pointer">
                      ចុះហៅអាណាព្យាបាល
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4 Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        <Link href="/principal/staff" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">14</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">គ្រូបង្រៀនសរុប</p>
        </Link>

        <Link href="/classes" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">18</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">ថ្នាក់រៀនសរុប</p>
        </Link>

        <Link href="/principal/reports" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">96%</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">វត្តមានសាលាប្រចាំខែ</p>
        </Link>

        <Link href="/principal/students" className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">680</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">សិស្សានុសិស្សសរុប</p>
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
              <div className="w-3 h-3 rounded bg-[#FFCF59]" />
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
                {attendancePath && <path d={attendancePath} fill="none" stroke="#FFCF59" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
                {gradesPath && <path d={gradesPath} fill="none" stroke="#155EEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
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
            <div className="p-4 rounded-[18px] bg-slate-50 border border-slate-100 flex items-start gap-4 hover:shadow-sm transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-sm">
                98%
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-800">អត្រាវត្តមានថ្នាក់ 12 ក បានកើនឡើង</div>
                <p className="text-xs font-semibold text-slate-500 mt-1">គ្រូបន្ទុកថ្នាក់៖ លោកគ្រូ សុខា បានបញ្ជូនរបាយការណ៍ថ្ងៃនេះ</p>
                <div className="text-[10px] text-slate-400 font-bold mt-1.5">២ ម៉ោងមុន</div>
              </div>
            </div>

            <div className="p-4 rounded-[18px] bg-slate-50 border border-slate-100 flex items-start gap-4 hover:shadow-sm transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#155EEF] flex items-center justify-center shrink-0 font-bold text-xs">
                ថ្មី
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-800">សេចក្តីប្រកាស៖ កិច្ចប្រជុំគរុកោសល្យខែសីហា</div>
                <p className="text-xs font-semibold text-slate-500 mt-1">បានផ្សព្វផ្សាយទៅកាន់គ្រូបង្រៀនទាំងអស់ដោយជោគជ័យ</p>
                <div className="text-[10px] text-slate-400 font-bold mt-1.5">៥ ម៉ោងមុន</div>
              </div>
            </div>

            <div className="p-4 rounded-[18px] bg-slate-50 border border-slate-100 flex items-start gap-4 hover:shadow-sm transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-800">សិស្សចំនួន ៥ នាក់មានអវត្តមានច្រើន</div>
                <p className="text-xs font-semibold text-slate-500 mt-1">ប្រព័ន្ធ EWS បានកត់ត្រាសិស្សដែលមានហានិភ័យបោះបង់ការសិក្សា</p>
                <div className="text-[10px] text-slate-400 font-bold mt-1.5">ម្សិលមិញ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
