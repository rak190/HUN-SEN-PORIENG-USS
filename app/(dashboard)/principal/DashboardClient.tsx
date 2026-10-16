'use client';

import React, { useState, useMemo } from 'react';
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
  BookOpen,
  Search,
  Mic,
  AlertTriangle,
  X,
  ChevronDown,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { SchoolOperationsControlCenter } from '@/components/dashboard/SchoolOperationsControlCenter';

export interface PrincipalDashboardClientProps {
  stats: {
    totalStudents: number;
    activeClasses: number;
    teachers: number;
    absentRate: string;
    absentRateLabel?: string;
    yearlyAbsentRate?: string;
  };
  trendData: { month: string; monthLabel: string; attendancePct: number; gradePct: number }[];
  demographics?: {
    girls: number;
    boys: number;
  };
  tableData?: {
    grade: string;
    classes: number;
    students: number;
    att: number;
    gpa: string;
    ab: string;
    eval: string;
  }[];
  overallGpa?: string;
  atRiskStudents: any[];
  activities: any[];
  unsubmittedAttendanceClasses?: string[];
  pendingFollowUpsCount?: number;
  schoolName?: string;
}

export default function PrincipalDashboardClient({
  stats,
  trendData,
  demographics = { girls: 0, boys: 0 },
  tableData = [],
  overallGpa = '0.00',
  atRiskStudents,
  activities,
  unsubmittedAttendanceClasses = [],
  pendingFollowUpsCount = 0,
  schoolName = 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'
}: PrincipalDashboardClientProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEwsModal, setShowEwsModal] = useState(false);
  const [trendRange, setTrendRange] = useState<'8' | '6' | '3' | 'all'>('8');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('កម្មវិធីរុករករបស់អ្នកមិនទាន់គាំទ្រ Voice Search ទេ សូមប្រើប្រាស់ Google Chrome ឬ Microsoft Edge');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'km-KH';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      }
    };
    recognition.start();
  };

  const quickLinks = [
    { title: 'បញ្ជីថ្នាក់រៀន', desc: 'ពិនិត្យថ្នាក់រៀន គ្រូ និងការស្រង់វត្តមាន', href: '/principal/classes', icon: BookOpen, color: 'text-[#155EEF]', bg: 'bg-blue-50' },
    { title: 'បុគ្គលិក និងលោកគ្រូ-អ្នកគ្រូ', desc: 'បញ្ជីគ្រូបង្រៀន និងភារកិច្ចទទួលខុសត្រូវ', href: '/principal/staff', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'បញ្ជីសិស្សទូទាំងសាលា', desc: 'ស្វែងរកសិស្ស តាមដានវត្តមាន និងព័ត៌មានលម្អិត', href: '/principal/students', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'របាយការណ៍ MoEYS', desc: 'ស្ថិតិផ្លូវការ និងការទាញយកទិន្នន័យ', href: '/admin/moeys-reports', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'សេចក្តីជូនដំណឹង', desc: 'ផ្សព្វផ្សាយព័ត៌មាន និងសេចក្តីប្រកាស', href: '/principal/announcements', icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  // Demographic calculations
  const girls = demographics?.girls || 0;
  const boys = demographics?.boys || 0;
  const demoTotal = (girls + boys) > 0 ? (girls + boys) : stats.totalStudents;
  const girlsPct = demoTotal > 0 ? Math.round((girls / demoTotal) * 100) : 50;
  const boysPct = demoTotal > 0 ? Math.round((boys / demoTotal) * 100) : 50;

  // Filter trend data
  const visibleTrendData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    if (trendRange === '3') return trendData.slice(-3);
    if (trendRange === '6') return trendData.slice(-6);
    return trendData;
  }, [trendData, trendRange]);

  const generateSvgPath = (data: { monthLabel: string; attendancePct: number; gradePct: number }[], key: 'attendancePct' | 'gradePct') => {
    if (!data || data.length === 0) return '';
    const points = data.map((d, i) => {
      const x = i * (500 / (data.length - 1 || 1));
      const y = 100 - d[key];
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };

  const attendancePath = generateSvgPath(visibleTrendData, 'attendancePct');
  const gradesPath = generateSvgPath(visibleTrendData, 'gradePct');

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* ================= 1. TOP HEADER (Aligned with /admin and /homeroom) ================= */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            ផ្ទាំងគ្រប់គ្រងនាយកសាលា
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            ស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងសាលា {schoolName} (ទិដ្ឋភាពទូទៅនៃស្ថាប័ន)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* EWS Alert Button */}
          {atRiskStudents.length > 0 && (
            <button
              onClick={() => setShowEwsModal(true)}
              className="relative p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-full shadow-xs text-rose-600 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={`${atRiskStudents.length} សិស្សកំពុងប្រឈមហានិភ័យ`}
            >
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white flex items-center justify-center text-[9px] font-black rounded-full border border-white">
                {atRiskStudents.length}
              </span>
            </button>
          )}

          {/* Standard Search Bar */}
          <div className="relative flex-1 sm:flex-none sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកទិន្នន័យសាលា..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full py-2.5 pl-11 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Voice Search Button */}
          <button
            onClick={handleVoiceSearch}
            className={`p-3 rounded-full shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center cursor-pointer ${
              isListening ? 'bg-rose-500 text-white animate-bounce ring-4 ring-rose-200' : 'bg-[#FFCF59] text-yellow-950 hover:bg-yellow-400'
            }`}
            title="ស្វែងរកដោយសំឡេង (Voice Search)"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Classes Direct Link */}
          <Link
            href="/principal/classes"
            className="px-4 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors items-center justify-center gap-2 shadow-sm shrink-0 flex"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">បញ្ជីថ្នាក់រៀន</span>
          </Link>
        </div>
      </header>

      {/* ================= 2. EWS MODAL (Frosted Glass Portal) ================= */}
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
        subtitle="Early Warning System (EWS) — វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង"
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
                  <Link
                    href={`/principal/students?filter=search:${encodeURIComponent(student.name)}`}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                  >
                    ពិនិត្យប្រវត្តិសិស្ស
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">
                មិនមានសិស្សប្រឈមហានិភ័យទេក្នុងខែនេះ។
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ================= 3. SCHOOL OPERATIONS CONTROL CENTER ================= */}
      <SchoolOperationsControlCenter
        unsubmittedAttendanceClasses={unsubmittedAttendanceClasses}
        atRiskCount={atRiskStudents.length}
        pendingFollowUpsCount={pendingFollowUpsCount}
      />

      {/* ================= 4. TOP 4 STAT CARDS (Standard KruAI Palette & Alignment) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Students (Signature Gold #FFCF59) */}
        <Link
          href="/principal/students"
          className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30"
        >
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.totalStudents}</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">ចំនួនសិស្សានុសិស្សសរុប</p>
        </Link>

        {/* Card 2: Classes (Clean White bg-white) */}
        <Link
          href="/principal/classes"
          className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-200"
        >
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">{stats.activeClasses}</h2>
            <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-slate-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">ចំនួនថ្នាក់រៀនសរុប</p>
        </Link>

        {/* Card 3: Absence Rate (Emerald Tint bg-emerald-50) */}
        <Link
          href="/principal/reports"
          className="bg-emerald-50 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-emerald-200"
        >
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-emerald-700 tracking-tight leading-none">{stats.absentRate}%</h2>
            <div className="w-9 h-9 rounded-full border border-emerald-200 flex items-center justify-center group-hover:bg-emerald-100 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-emerald-500 transition-colors" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-600 mt-4">{stats.absentRateLabel || 'អត្រាអវត្តមានខែនេះ'}</p>
            {stats.yearlyAbsentRate && (
              <p className="text-[11px] font-semibold text-emerald-700/70 mt-0.5">ប្រចាំឆ្នាំ: {stats.yearlyAbsentRate}%</p>
            )}
          </div>
        </Link>

        {/* Card 4: Teachers & Staff (Signature Royal Blue #155EEF) */}
        <Link
          href="/principal/staff"
          className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30"
        >
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.teachers}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">ចំនួនគ្រូបង្រៀន និងបុគ្គលិក</p>
        </Link>
      </div>

      {/* ================= 5. CHARTS ROW 1 (Demographic Donut 4 cols + Monthly Trends 8 cols) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gender Demographic Donut (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">ស្ថិតិសិស្សតាមភេទ</h3>
              <p className="text-[11px] text-[#64748B] font-medium">សមាមាត្រប្រុស និងស្រី</p>
            </div>
            <span className="text-xs font-bold text-[#64748B] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              ទូទាំងសាលា
            </span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 transform drop-shadow-md overflow-visible">
                {/* Background Track */}
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                {/* Girls Segment (#FFCF59) */}
                {girlsPct > 0 && (
                  <path
                    stroke="#FFCF59"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${girlsPct}, 100`}
                    strokeDashoffset="0"
                    className="transition-all duration-1000 ease-out"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
                {/* Boys Segment (#155EEF) */}
                {boysPct > 0 && (
                  <path
                    stroke="#155EEF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${boysPct}, 100`}
                    strokeDashoffset={-girlsPct}
                    className="transition-all duration-1000 ease-out"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">សរុប</span>
                <span className="text-3xl font-black text-slate-800">{demoTotal}</span>
                <span className="text-[10px] text-slate-400 font-bold">នាក់</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between px-4 pt-3 border-t border-slate-50">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFCF59]" />
                <span className="text-xs text-[#64748B] font-bold">សិស្សស្រី</span>
              </div>
              <span className="font-extrabold text-slate-800 text-lg mt-0.5">{girls} ({girlsPct}%)</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#155EEF]" />
                <span className="text-xs text-[#64748B] font-bold">សិស្សប្រុស</span>
              </div>
              <span className="font-extrabold text-slate-800 text-lg mt-0.5">{boys} ({boysPct}%)</span>
            </div>
          </div>
        </div>

        {/* Monthly Attendance & Performance Trends (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">សន្ទស្សន៍សាលារៀនប្រចាំខែ</h3>
              <p className="text-[11px] text-[#64748B] font-medium">ប្រៀបធៀបអត្រាវត្តមាន និងពិន្ទុមធ្យមសិក្សា</p>
            </div>
            <div className="relative inline-flex items-center">
              <select
                value={trendRange}
                onChange={(e) => setTrendRange(e.target.value as any)}
                className="appearance-none bg-slate-50 text-xs font-bold text-[#64748B] px-3 py-1.5 pr-7 rounded-lg border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors hover:bg-slate-100"
              >
                <option value="8">8 ខែចុងក្រោយ</option>
                <option value="6">6 ខែចុងក្រោយ</option>
                <option value="3">3 ខែចុងក្រោយ</option>
                <option value="all">ពេញមួយឆ្នាំ</option>
              </select>
              <div className="pointer-events-none absolute right-2 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-xs font-extrabold text-[#64748B]">វត្តមាន (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#155EEF]" />
              <span className="text-xs font-extrabold text-[#64748B]">ពិន្ទុប្រឡងមធ្យម (%)</span>
            </div>
          </div>

          <div className="flex-1 w-full relative pt-4 min-h-[190px]">
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
                {attendancePath && (
                  <path
                    d={attendancePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                  />
                )}
                {gradesPath && (
                  <path
                    d={gradesPath}
                    fill="none"
                    stroke="#155EEF"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                  />
                )}
              </svg>
            </div>
            <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[11px] font-extrabold text-[#64748B] px-2">
              {visibleTrendData.map((d, i) => (
                <span key={i}>{d.monthLabel}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 6. ROW 2 (Grade-Level Table 7 cols + Quick Management Actions 5 cols) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grade-Level Performance Table (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#155EEF]" />
                <span>តារាងសង្ខេបតាមកម្រិតថ្នាក់</span>
              </h3>
              <p className="text-[11px] text-[#64748B] font-medium mt-0.5">ស្ថិតិសិស្ស ថ្នាក់ និងលទ្ធផលសិក្សាតាមថ្នាក់នីមួយៗ</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#155EEF] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                GPA មធ្យម: {overallGpa}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[#64748B] font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">កម្រិតថ្នាក់</th>
                  <th className="py-2.5 px-3 text-center">ចំនួនថ្នាក់</th>
                  <th className="py-2.5 px-3 text-center">សិស្សសរុប</th>
                  <th className="py-2.5 px-3 text-center">វត្តមាន (%)</th>
                  <th className="py-2.5 px-3 text-center">GPA</th>
                  <th className="py-2.5 px-3 text-right">វាយតម្លៃ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                {tableData && tableData.length > 0 ? (
                  tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#155EEF]" />
                        <span>{row.grade}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">{row.classes} ថ្នាក់</td>
                      <td className="py-2.5 px-3 text-center">{row.students} នាក់</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-extrabold border border-emerald-100">
                          {row.att.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-blue-700">{row.gpa}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          row.eval === 'ល្អប្រសើរ' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          row.eval === 'ល្អ' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          row.eval === 'មធ្យមល្អ' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {row.eval}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 font-bold">
                      មិនទាន់មានទិន្នន័យកម្រិតថ្នាក់
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Management Actions (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="font-extrabold text-slate-800 text-base">មុខងារគ្រប់គ្រងសាលា</h3>
              <p className="text-[11px] text-[#64748B] font-medium mt-0.5">ចូលទៅកាន់ទិន្នន័យប្រតិបត្តិការសំខាន់ៗ</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 p-3.5 rounded-2xl bg-[#F4F7FE] border border-blue-100/80">
              {quickLinks.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-all shadow-2xs group cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{item.title}</div>
                      <div className="text-[10px] text-[#64748B] font-medium truncate">{item.desc}</div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-[#155EEF] group-hover:text-white text-slate-400 flex items-center justify-center transition-all shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 7. ROW 3 (Recent School Activities Stream) ================= */}
      <div className="bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#155EEF]" />
              <span>សកម្មភាពថ្មីៗក្នុងសាលារៀន</span>
            </h3>
            <p className="text-[11px] text-[#64748B] font-medium mt-0.5">កំណត់ត្រាប្រតិបត្តិការ និងការធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</p>
          </div>
          <Link href="/principal/announcements" className="text-xs font-extrabold text-[#155EEF] hover:underline shrink-0">
            មើលសេចក្តីជូនដំណឹងទាំងអស់ &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {activities.length > 0 ? (
            activities.map((act) => (
              <div key={act.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3 hover:shadow-2xs transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#155EEF] flex items-center justify-center shrink-0">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-800 truncate">{act.action}</div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">ដោយ៖ {act.profiles?.full_name || 'ប្រព័ន្ធ (System)'}</p>
                  <div className="text-[10px] text-slate-400 font-bold mt-1">
                    {new Date(act.created_at).toLocaleString('km-KH')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-slate-500 font-bold text-sm">មិនមានសកម្មភាពថ្មីៗទេ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
