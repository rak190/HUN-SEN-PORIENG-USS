'use client';

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Mic, AlertTriangle, X, ArrowUpRight, 
  Users, CheckCircle2, ShieldCheck, Database, Server,
  MessageSquare, UserCog, History, ShieldAlert,
  GraduationCap, Building, Activity,
  Calendar, ChevronDown, UserPlus, Award, Trash2, Building2, Clock
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

function formatActivityTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeFormatted = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return `ថ្ងៃនេះ ${timeFormatted}`;
    if (isYesterday) return `ម្សិលមិញ ${timeFormatted}`;

    const monthNamesKm = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    return `${date.getDate()} ${monthNamesKm[date.getMonth()]} • ${timeFormatted}`;
  } catch {
    return dateStr;
  }
}

function getActivityTheme(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('សិស្ស') || lower.includes('student') || lower.includes('ចុះឈ្មោះ') || lower.includes('register') || lower.includes('import')) {
    return {
      icon: UserPlus,
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
  }
  if (lower.includes('ពិន្ទុ') || lower.includes('ប្រឡង') || lower.includes('grade') || lower.includes('score') || lower.includes('exam')) {
    return {
      icon: Award,
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
    };
  }
  if (lower.includes('ថ្នាក់') || lower.includes('ឆ្នាំសិក្សា') || lower.includes('class') || lower.includes('year') || lower.includes('វត្តមាន')) {
    return {
      icon: Calendar,
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
    };
  }
  if (lower.includes('លុប') || lower.includes('delete') || lower.includes('purge')) {
    return {
      icon: Trash2,
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
    };
  }
  if (lower.includes('សាលា') || lower.includes('ព័ត៌មាន') || lower.includes('school') || lower.includes('geip') || lower.includes('setting')) {
    return {
      icon: Building2,
      bg: 'bg-purple-50 text-purple-600 border-purple-100',
    };
  }
  return {
    icon: Clock,
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
  };
}

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  profiles?: { full_name: string };
}

interface AdminDashboardClientProps {
  stats: {
    totalStudents: number;
    activeClasses: number;
    teachers: number;
    absentRate: string;
    todayTotal?: number;
    todayAbsent?: number;
    todayRecorded?: number;
  };
  pieData: {
    present: number;
    absent: number;
    permission: number;
  };
  activities: ActivityLog[];
  atRiskStudents: any[];
  currentMonth: string;
  dataQuality?: {
    missingIdCount: number;
    pendingCorrections: number;
  };
  dbErrors?: string[];
}

export default function AdminDashboardClient({ stats, pieData, activities, atRiskStudents, currentMonth, dataQuality, dbErrors }: AdminDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEwsModal, setShowEwsModal] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Generate 10 months of the academic year (November to August) with explicit calendar math
  const monthsList = React.useMemo(() => {
    const today = new Date();
    const currentMonthIdx = today.getMonth(); // 0-11
    
    // Academic year starts in November (month index 10)
    // If we are currently in Jan-Oct (0-9), the start year is last year
    // If we are in Nov-Dec (10-11), the start year is this year
    const startYear = currentMonthIdx >= 10 ? today.getFullYear() : today.getFullYear() - 1;
    
    return Array.from({ length: 10 }).map((_, i) => {
      const totalMonth = 10 + i; // 10=Nov, 11=Dec, 12=Jan, 13=Feb, ...
      const year = startYear + Math.floor(totalMonth / 12);
      const monthNum = (totalMonth % 12) + 1; // 1-12
      const value = `${year}-${String(monthNum).padStart(2, '0')}`;
      
      const d = new Date(year, monthNum - 1, 15);
      const label = d.toLocaleDateString('km-KH', { year: 'numeric', month: 'long' });
      return { value, label };
    });
  }, []);

  const handleMonthChange = (monthVal: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('month', monthVal);
    router.replace(`${pathname}?${params.toString()}`);
    setShowMonthDropdown(false);
  };


  // SVG Premium Donut Logic (100-based coordinates)
  const totalAttendance = pieData.present + pieData.absent + pieData.permission;
  
  const presentPct = totalAttendance === 0 ? 0 : (pieData.present / totalAttendance) * 100;
  const absentPct = totalAttendance === 0 ? 0 : (pieData.absent / totalAttendance) * 100;
  const permissionPct = totalAttendance === 0 ? 0 : (pieData.permission / totalAttendance) * 100;

  const presentOffset = 0;
  const absentOffset = -presentPct;
  const permissionOffset = -(presentPct + absentPct);

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
        </div>
      </header>

      {/* Partial Database Query Failure Warning */}
      {dbErrors && dbErrors.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-bold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-extrabold text-amber-900">ការទាញយកទិន្នន័យខ្លះមិនបានពេញលេញ (Partial Query Failure)</p>
            <p className="text-amber-700 font-medium mt-0.5">ទិន្នន័យស្ថិតិខ្លះប្រហែលជាមិនទាន់ធ្វើបច្ចុប្បន្នភាពពេញលេញដោយសារបញ្ហាតភ្ជាប់បណ្តោះអាសន្ន។</p>
          </div>
        </div>
      )}

      {/* 4 Top Stat Cards */}
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
            {stats.todayRecorded === 0 ? (
               <h2 className="text-xl font-black text-rose-700 tracking-tight leading-tight pt-2">មិនទាន់កត់ត្រាថ្ងៃនេះ</h2>
            ) : (
               <h2 className="text-4xl font-black text-rose-700 tracking-tight leading-none">{stats.todayAbsent} នាក់</h2>
            )}
            <div className="w-9 h-9 rounded-full border border-rose-200 flex items-center justify-center group-hover:bg-rose-100 transition-all shadow-2xs shrink-0">
              <ArrowUpRight className="w-4 h-4 text-rose-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-rose-600 mt-4">
             {stats.todayRecorded === 0 
               ? `អវត្តមានថ្ងៃនេះ (សិស្សសរុប ${stats.todayTotal})` 
               : `អវត្តមាន ${stats.todayAbsent} នាក់ / វត្តមាន ${(stats.todayTotal || 0) - (stats.todayAbsent || 0)} នាក់`
             }
          </p>
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
        
        {/* Main Chart Area (Premium Donut Chart) */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 flex flex-col relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#155EEF]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#FFCF59]/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-800">អត្រាវត្តមានសរុប</h3>
                <div className="relative">
                  <button 
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs font-bold text-slate-600"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#155EEF]" />
                    {monthsList.find(m => m.value === currentMonth)?.label || currentMonth}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  
                  {showMonthDropdown && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowMonthDropdown(false)} />
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        {monthsList.map(m => (
                          <button
                            key={m.value}
                            onClick={() => handleMonthChange(m.value)}
                            className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-blue-50 hover:text-[#155EEF] transition-colors ${currentMonth === m.value ? 'text-[#155EEF] bg-blue-50/50' : 'text-slate-600'}`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-1">ស្ថិតិបែងចែកប្រចាំខែ</p>
            </div>
            <div className="flex flex-col gap-2.5 text-xs font-bold items-end">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-[#155EEF]"></span> វត្តមាន ({Math.round(presentPct)}%)</div>
              <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full border border-rose-100 shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]"></span> អវត្តមាន ({Math.round(absentPct)}%)</div>
              <div className="flex items-center gap-2 bg-[#FFCF59]/10 text-amber-700 px-3 py-1.5 rounded-full border border-[#FFCF59]/20 shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-[#FFCF59]"></span> ច្បាប់ ({Math.round(permissionPct)}%)</div>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative min-h-[280px]">
            {/* Floating Badges */}
            {presentPct > 0 && (
              <div className="absolute top-[10%] right-[15%] z-20 animate-float-slow hidden sm:flex flex-col items-center">
                <div className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-blue-100 text-[#155EEF] font-black text-sm flex items-center gap-1.5">
                  {pieData.present} <span className="text-[10px] text-blue-400 font-bold">នាក់</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#155EEF] mt-2 shadow-[0_0_8px_rgba(21,94,239,0.8)]"></div>
              </div>
            )}
            
            {absentPct > 0 && (
              <div className="absolute bottom-[10%] right-[20%] z-20 animate-float-delayed hidden sm:flex flex-col items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] mb-2 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                <div className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-rose-100 text-[#F43F5E] font-black text-sm flex items-center gap-1.5">
                  {pieData.absent} <span className="text-[10px] text-rose-400 font-bold">នាក់</span>
                </div>
              </div>
            )}

            <div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center">
              {/* Decorative outer dashed ring */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-spin-slow opacity-30">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 6" />
              </svg>

              <svg viewBox="0 0 36 36" className="w-48 h-48 md:w-56 md:h-56 -rotate-90 transform drop-shadow-2xl overflow-visible">
                {/* Background Track */}
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                
                {/* Permission */}
                {permissionPct > 0 && <path stroke="#FFCF59" strokeWidth="3.5" strokeLinecap="round" fill="none"
                  strokeDasharray={`${permissionPct}, 100`} strokeDashoffset={permissionOffset}
                  className="transition-all duration-1000 ease-out" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />}
                  
                {/* Absent */}
                {absentPct > 0 && <path stroke="#F43F5E" strokeWidth="3.5" strokeLinecap="round" fill="none"
                  strokeDasharray={`${absentPct}, 100`} strokeDashoffset={absentOffset}
                  className="transition-all duration-1000 ease-out" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />}
                  
                {/* Present */}
                {presentPct > 0 && <path stroke="#155EEF" strokeWidth="3.5" strokeLinecap="round" fill="none"
                  strokeDasharray={`${presentPct}, 100`} strokeDashoffset={presentOffset}
                  className="transition-all duration-1000 ease-out" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">{totalAttendance}</span>
                <span className="text-xs font-bold text-slate-400 mt-1 bg-slate-100 px-3 py-1 rounded-full">សរុប</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Activity Feed */}
        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full min-h-[440px] max-h-[500px] overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#155EEF] flex items-center justify-center shadow-2xs">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-none">សកម្មភាពប្រព័ន្ធ</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">កំណត់ត្រាប្រតិបត្តិការចុងក្រោយ</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-full shadow-2xs">
              {activities.length} សកម្មភាព
            </span>
          </div>

          {/* Scrollable Feed Viewport */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <History className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-600">គ្មានសកម្មភាពថ្មីៗ</p>
                <p className="text-xs text-slate-400 mt-1">រាល់ប្រតិបត្តិការក្នុងប្រព័ន្ធនឹងបង្ហាញនៅទីនេះ</p>
              </div>
            ) : (
              activities.map((log) => {
                const theme = getActivityTheme(log.action);
                const IconComponent = theme.icon;
                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-2xs transition-all flex items-start gap-3.5 group"
                  >
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs transition-transform group-hover:scale-105 ${theme.bg}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-relaxed break-words" title={log.action}>
                        {log.action}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-1.5 border-t border-slate-100 text-[11px]">
                        <span className="font-bold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                          {log.profiles?.full_name || 'System User'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatActivityTime(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Data Quality & Exception Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
         <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
               <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
               <h3 className="font-black text-slate-800 text-lg">បាត់អត្តលេខសិស្ស</h3>
               <p className="text-xs text-slate-500 font-medium mt-1">
                  សិស្ស {dataQuality?.missingIdCount || 0} នាក់ មិនមានអត្តលេខផ្លូវការ។ សូមនាំចូលទិន្នន័យពី Excel (Basic Import)។
               </p>
               <div className="mt-4 flex items-center gap-2">
                  <span className="text-2xl font-black text-amber-600">{dataQuality?.missingIdCount || 0}</span>
                  <span className="text-sm font-bold text-slate-400">នាក់</span>
               </div>
            </div>
         </div>

         <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
               <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
               <h3 className="font-black text-slate-800 text-lg">សំណើកែប្រែទិន្នន័យ (Pending)</h3>
               <p className="text-xs text-slate-500 font-medium mt-1">
                  គ្រូបន្ទុកថ្នាក់បានស្នើសុំកែប្រែទិន្នន័យមូលដ្ឋានរបស់សិស្ស ចំនួន {dataQuality?.pendingCorrections || 0} ករណី។
               </p>
               <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                     <span className="text-2xl font-black text-indigo-600">{dataQuality?.pendingCorrections || 0}</span>
                     <span className="text-sm font-bold text-slate-400">សំណើ</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

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
        title="សិស្សប្រឈមហានិភ័យ"
        subtitle="Early Warning System (EWS)"
      >
        <div className="p-6 sm:p-8 space-y-4">
          {atRiskStudents.length === 0 ? (
            <div className="text-center py-12 font-bold text-slate-400">
              គ្មានសិស្សប្រឈមហានិភ័យទេ
            </div>
          ) : (
            atRiskStudents.map((student: any) => (
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
                  <Link
                    href={`/admin/students?id=${student.id}`}
                    onClick={() => setShowEwsModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer block text-center shadow-xs active:scale-95"
                  >
                    អន្តរាគមន៍ (Intervene)
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
