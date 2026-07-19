'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Mic, ArrowUpRight, Award, Globe, Share2,
  MessageCircle, Mail, CalendarCheck, ClipboardList,
  Plus, Trash2, ChevronDown, AlertTriangle, X
} from 'lucide-react';
import { ActivityLog, Profile, AtRiskStudent } from '@/types';
import { createActivityLog, deleteActivityLog } from './actions';

interface DashboardStats {
  students: string;
  remediation: string;
  attendance: string;
  reports: string;
  totalNum: string;
  girls: string;
  boys: string;
  classNameKh: string;
  weeklyData: { day: string; present: number; absent: number }[];
  trendData: { monthLabel: string; attendancePct: number; gradePct: number }[];
}

interface DashboardClientProps {
  stats: DashboardStats;
  activities: ActivityLog[];
  profile: Profile | null;
  atRiskStudents?: AtRiskStudent[];
}

export default function DashboardClient({ stats, activities, profile, atRiskStudents = [] }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentClass = searchParams.get('classId') || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'report' | 'attendance' | 'award' | 'student'>('award');
  const [isPending, startTransition] = useTransition();
  const [showEwsBanner, setShowEwsBanner] = useState(true);
  const [showEwsModal, setShowEwsModal] = useState(false);
  const [footerModalData, setFooterModalData] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val === 'all') {
      params.delete('classId');
    } else {
      params.set('classId', val);
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createActivityLog({
        title: newTitle.trim(),
        description: newDesc.trim() || `កំណត់ត្រាសកម្មភាពក្នុង ${stats.classNameKh}`,
        activity_type: newType,
        class_id: currentClass === 'all' ? undefined : currentClass
      });
      setNewTitle('');
      setNewDesc('');
      setShowAddModal(false);
    } catch (err) {
      alert('បរាជ័យក្នុងការកត់ត្រាសកម្មភាព');
    }
  }

  async function handleDeleteActivity(id: string) {
    if (confirm('តើអ្នកពិតជាចង់លុបកំណត់ត្រានេះមែនទេ?')) {
      try {
        await deleteActivityLog(id);
      } catch (err) {
        alert('បរាជ័យក្នុងការលុបកំណត់ត្រា');
      }
    }
  }

  const filteredActivities = activities.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateSvgPath = (data: { monthLabel: string; attendancePct: number; gradePct: number }[], key: 'attendancePct' | 'gradePct') => {
    if (!data || data.length === 0) return '';
    const points = data.map((d, i) => {
      const x = i * (500 / (data.length - 1 || 1));
      const y = 100 - d[key];
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };
  
  const attendancePath = generateSvgPath(stats.trendData, 'attendancePct');
  const gradesPath = generateSvgPath(stats.trendData, 'gradePct');

  return (
    <div className={`space-y-6 animate-fadeIn select-none ${isPending ? 'opacity-70' : ''}`}>
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            {profile?.role === 'principal'
              ? 'ផ្ទាំងគ្រប់គ្រងនាយកសាលា'
              : profile?.role === 'admin'
              ? 'ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ'
              : 'ផ្ទាំងគ្រប់គ្រងគ្រូបង្រៀន'}
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            ស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងសាលា វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* EWS Alert Symbol (Replaced Banner) */}
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

          {/* Search Bar */}
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

          {/* Voice Search Button */}
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
                  <h2 className="text-xl font-black text-slate-900">សិស្សប្រឈមហានិភ័យ</h2>
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
        <Link href="/students" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.students}</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សសរុប</p>
        </Link>

        <Link href="/students?filter=remediation" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.remediation}</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សត្រូវការបំប៉ន</p>
        </Link>

        <Link href="/attendance" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.attendance}</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">អត្រាវត្តមានសរុប</p>
        </Link>

        <Link href="/reports" className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.reports}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">របាយការណ៍សរុប</p>
        </Link>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-extrabold text-slate-800 text-base">ស្ថិតិសិស្សតាមភេទ</h3>
            <span className="text-xs font-bold text-[#64748B] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              {stats.classNameKh}
            </span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="donut-chart shadow-md">
              <div className="donut-inner shadow-inner">
                <span className="text-[11px] text-[#64748B] font-extrabold uppercase tracking-wider">សរុប</span>
                <span className="text-3xl font-black text-slate-800">{stats.totalNum}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between px-4 pt-2 border-t border-slate-50">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFCF59]" />
                <span className="text-xs text-[#64748B] font-bold">សិស្សស្រី</span>
              </div>
              <span className="font-extrabold text-slate-800 text-lg">{stats.girls}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#155EEF]" />
                <span className="text-xs text-[#64748B] font-bold">សិស្សប្រុស</span>
              </div>
              <span className="font-extrabold text-slate-800 text-lg">{stats.boys}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">កម្រិតវត្តមាន និងពិន្ទុមធ្យម</h3>
              <p className="text-[11px] text-[#64748B] font-medium">ស្ថិតិប្រៀបធៀបប្រចាំខែក្នុងឆ្នាំសិក្សាសម្រាប់ {stats.classNameKh}</p>
            </div>
            <div className="relative inline-flex items-center">
              <select className="appearance-none bg-slate-50 text-xs font-bold text-[#64748B] px-3 py-1.5 pr-7 rounded-lg border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors hover:bg-slate-100">
                <option value="8">8 ខែចុងក្រោយ</option>
                <option value="6">6 ខែចុងក្រោយ</option>
                <option value="3">3 ខែចុងក្រោយ</option>
                <option value="all">ពេញមួយឆ្នាំ</option>
              </select>
              <div className="pointer-events-none absolute right-2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#FFCF59]" />
              <span className="text-xs font-extrabold text-[#64748B]">វត្តមាន (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#155EEF]" />
              <span className="text-xs font-extrabold text-[#64748B]">ពិន្ទុប្រឡង (%)</span>
            </div>
          </div>

          <div className="flex-1 w-full relative pt-4 min-h-[180px]">
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
              {stats.trendData?.map((d, i) => <span key={i}>{d.monthLabel}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">វត្តមានប្រចាំសប្តាហ៍</h3>
              <p className="text-[11px] text-[#64748B] font-medium">ស្ថិតិវត្តមាន និងអវត្តមានប្រចាំថ្ងៃក្នុង {stats.classNameKh}</p>
            </div>
            <div className="relative inline-flex items-center">
              <select className="appearance-none bg-slate-50 text-xs font-bold text-[#64748B] px-3 py-1.5 pr-7 rounded-lg border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors hover:bg-slate-100">
                <option value="weekly">ប្រចាំសប្តាហ៍</option>
                <option value="monthly">ប្រចាំខែ</option>
                <option value="semester">ប្រចាំឆមាស</option>
              </select>
              <div className="pointer-events-none absolute right-2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="flex gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#FFCF59]" />
              <span className="text-xs font-extrabold text-[#64748B]">វត្តមាន</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#155EEF]" />
              <span className="text-xs font-extrabold text-[#64748B]">អវត្តមាន</span>
            </div>
          </div>

          <div className="flex-1 flex pt-2 min-h-[160px]">
            <div className="flex flex-col justify-between text-[10px] font-bold text-[#64748B] pb-6 pr-3">
              <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
            </div>
            <div className="flex-1 flex justify-between items-end pb-6 relative px-2">
              {stats.weeklyData?.map((d, i) => (
                <div key={i} className="w-8 h-full flex flex-col justify-end group cursor-pointer relative">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white shadow-xl rounded-xl p-2 text-[10px] whitespace-nowrap z-20 font-bold leading-tight border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    វត្តមាន: <span className="text-[#FFCF59]">{d.present}%</span><br />
                    អវត្តមាន: <span className="text-blue-300">{d.absent}%</span>
                  </div>
                  <div className="w-full bg-[#155EEF] rounded-t-md group-hover:brightness-110 transition-all" style={{ height: `${d.absent}%` }} />
                  <div className="w-full bg-[#FFCF59] rounded-b-md group-hover:brightness-95 transition-all" style={{ height: `${d.present}%` }} />
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-extrabold text-[#64748B] px-2">
                {stats.weeklyData?.map((d, i) => <span key={i} className="w-8 text-center">{d.day}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Student Activities */}
        <div className="lg:col-span-7 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <span>សកម្មភាព និងសមិទ្ធផលជាក់ស្តែងក្នុងថ្នាក់</span>
                  <span className="text-[10px] font-black bg-blue-50 text-[#155EEF] px-2 py-0.5 rounded-full border border-blue-100">
                    {stats.classNameKh}
                  </span>
                </h3>
                <p className="text-[11px] text-[#64748B] font-medium">កំណត់ត្រាផ្ទាល់ពីសកម្មភាពបង្រៀន និងសិស្សានុសិស្ស</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(!showAddModal)}
                  className="px-3 py-1.5 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddModal ? 'បិទ' : 'កត់ត្រាសកម្មភាព'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-2xl bg-[#F4F7FE] border border-blue-100/80">
              <Link href="/grades" className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all shadow-2xs group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">បញ្ចូលពិន្ទុប្រឡង</div>
                  <div className="text-[10px] text-[#64748B] font-medium truncate">តារាងចំណាត់ថ្នាក់</div>
                </div>
              </Link>
              <Link href="/attendance" className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all shadow-2xs group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">ស្រង់វត្តមានថ្ងៃនេះ</div>
                  <div className="text-[10px] text-[#64748B] font-medium truncate">{stats.classNameKh}</div>
                </div>
              </Link>
            </div>

            {showAddModal && (
              <form onSubmit={handleAddActivity} className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-800">បន្ថែមសកម្មភាព ឬកំណត់ត្រាថ្មី</h4>
                  <span className="text-[10px] font-bold text-[#64748B]">សម្រាប់ {stats.classNameKh}</span>
                </div>
                <input
                  type="text"
                  placeholder="ចំណងជើងសកម្មភាព (ឧ. បញ្ចប់មេរៀនទី 3 មុខវិជ្ជាគណិតវិទ្យា)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 font-bold focus:outline-none focus:border-[#155EEF]"
                />
                <input
                  type="text"
                  placeholder="ការពិពណ៌នាលម្អិត ឬសមិទ្ធផលសិស្ស..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 font-medium focus:outline-none focus:border-[#155EEF]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setNewType('award')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${newType === 'award' ? 'bg-[#FFCF59] text-yellow-950 shadow-2xs font-extrabold' : 'bg-white text-slate-600 border border-slate-200'}`}>
                      🏆 សមិទ្ធផល/រង្វាន់
                    </button>
                    <button type="button" onClick={() => setNewType('report')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${newType === 'report' ? 'bg-purple-600 text-white shadow-2xs font-extrabold' : 'bg-white text-slate-600 border border-slate-200'}`}>
                      📊 របាយការណ៍ពិន្ទុ
                    </button>
                    <button type="button" onClick={() => setNewType('attendance')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${newType === 'attendance' ? 'bg-[#155EEF] text-white shadow-2xs font-extrabold' : 'bg-white text-slate-600 border border-slate-200'}`}>
                      📅 វត្តមានសិស្ស
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer">
                      បោះបង់
                    </button>
                    <button type="submit" disabled={isPending} className="px-4 py-1 text-xs font-bold bg-[#155EEF] text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50">
                      កត់ត្រា
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-sm">
                  ពុំទាន់មានសកម្មភាពត្រូវបានកត់ត្រាក្នុង {stats.classNameKh} នៅឡើយទេ។
                </div>
              ) : (
                filteredActivities.map((item) => (
                  <div key={item.id} className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-white hover:bg-slate-50 transition-all border border-slate-100/80 hover:border-slate-200 group relative shadow-2xs">
                    <div className={`p-3 rounded-2xl shadow-sm shrink-0 ${
                      item.activity_type === 'award' ? 'bg-[#FFCF59] text-yellow-950' :
                      item.activity_type === 'report' ? 'bg-purple-600 text-white' : 'bg-[#155EEF] text-white'
                    }`}>
                      {item.activity_type === 'award' ? <Award className="w-5 h-5" /> :
                       item.activity_type === 'report' ? <ClipboardList className="w-5 h-5" /> : <CalendarCheck className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-[#155EEF] transition-colors">
                          {item.title}
                        </h4>
                        {item.class_id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            ថ្នាក់ {item.class_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] mt-1 font-medium line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between shrink-0 h-full">
                      <div className="text-[11px] text-right font-extrabold text-[#64748B]">
                        {new Date(item.created_at).toLocaleDateString('km-KH')}
                      </div>
                      <button
                        onClick={() => handleDeleteActivity(item.id)}
                        disabled={isPending}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all mt-1 cursor-pointer disabled:opacity-50"
                        title="លុបកំណត់ត្រា"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-50 flex justify-end">
            <Link href="/reports" className="text-xs font-extrabold text-[#155EEF] hover:underline flex items-center gap-1">
              <span>មើលរបាយការណ៍សកម្មភាពទាំងអស់</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row gap-4 text-xs font-bold text-[#64748B] pt-6 justify-between items-center border-t border-slate-200/60">
        <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
          <span>រក្សាសិទ្ធិគ្រប់យ៉ាង © 2026 វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</span>
          <button 
            onClick={() => setFooterModalData({
              title: 'គោលការណ៍ឯកជនភាព (Privacy Policy)',
              content: (
                <div className="space-y-4 text-sm font-medium text-slate-600">
                  <p>វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង មានការប្តេជ្ញាចិត្តក្នុងការការពារទិន្នន័យផ្ទាល់ខ្លួនរបស់សិស្ស លោកគ្រូ អ្នកគ្រូ និងមាតាបិតា។</p>
                  <p>រាល់ទិន្នន័យពិន្ទុ អវត្តមាន និងព័ត៌មានផ្ទាល់ខ្លួនត្រូវបានរក្សាការសម្ងាត់យ៉ាងតឹងរ៉ឹង និងប្រើប្រាស់សម្រាប់តែគោលបំណងអប់រំប៉ុណ្ណោះ។</p>
                  <p>ប្រព័ន្ធនេះត្រូវបានគ្រប់គ្រងដោយស្របតាមគោលការណ៍ណែនាំរបស់ក្រសួងអប់រំ យុវជន និងកីឡា។</p>
                </div>
              )
            })}
            className="hover:text-slate-900 cursor-pointer transition-colors"
          >
            គោលការណ៍ឯកជនភាព
          </button>
          <button 
            onClick={() => setFooterModalData({
              title: 'លក្ខខណ្ឌប្រើប្រាស់ (Terms of Use)',
              content: (
                <div className="space-y-4 text-sm font-medium text-slate-600">
                  <p>រាល់គណនីប្រើប្រាស់ប្រព័ន្ធត្រូវតែទទួលបានការអនុញ្ញាតពីនាយកសាលា។</p>
                  <p>អ្នកប្រើប្រាស់មិនត្រូវចែករំលែកពាក្យសម្ងាត់គណនីទៅកាន់តតិយជនឡើយ។</p>
                  <p>ការបញ្ចូលទិន្នន័យក្លែងបន្លំ ឬការលុបទិន្នន័យដោយគ្មានការអនុញ្ញាត នឹងត្រូវទទួលខុសត្រូវតាមបទបញ្ជាផ្ទៃក្នុងសាលា។</p>
                </div>
              )
            })}
            className="hover:text-slate-900 cursor-pointer transition-colors"
          >
            លក្ខខណ្ឌប្រើប្រាស់
          </button>
          <a href="mailto:support@porieng.edu.kh" className="hover:text-slate-900 cursor-pointer transition-colors">ទំនាក់ទំនងជំនួយ</a>
        </div>
        <div className="flex gap-3 text-slate-500">
          <a href="https://moeys.gov.kh" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:text-[#155EEF] hover:border-[#155EEF] transition-all shadow-2xs" title="Website"><Globe className="w-4 h-4" /></a>
          <a href="https://web.facebook.com/HunSenPoriengHighSchool/?locale=km_KH&_rdc=1&_rdr#" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:text-[#155EEF] hover:border-[#155EEF] transition-all shadow-2xs" title="Facebook"><Share2 className="w-4 h-4" /></a>
          <a href="https://t.me/norakrun" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:text-[#155EEF] hover:border-[#155EEF] transition-all shadow-2xs" title="Telegram Community"><MessageCircle className="w-4 h-4" /></a>
          <a href="mailto:support@porieng.edu.kh" className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:text-[#155EEF] hover:border-[#155EEF] transition-all shadow-2xs" title="Contact Support"><Mail className="w-4 h-4" /></a>
        </div>
      </footer>

      {/* Footer Modal */}
      {footerModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setFooterModalData(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl scale-100 animate-slideUp relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setFooterModalData(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full p-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-black text-slate-900 pr-10">{footerModalData.title}</h3>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              {footerModalData.content}
            </div>
            <div className="pt-2">
              <button 
                onClick={() => setFooterModalData(null)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-sm transition-all text-sm cursor-pointer"
              >
                យល់ព្រម
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
