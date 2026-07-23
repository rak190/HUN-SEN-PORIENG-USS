'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Calendar, Upload, Download, ArrowUpRight, 
  TrendingUp, AlertTriangle, X
} from 'lucide-react';
import Link from 'next/link';
import { MasterGradeImportModal } from '@/components/principal/MasterGradeImportModal';
import { fetchPrincipalDashboardData } from '../actions';

const MOCK_TERMS = {
  'sem1-2026': {
    students: '1,345',
    attendance: '96.8',
    gpa: '3.42',
    atRisk: '45',
    girls: '685',
    boys: '660',
    weeklyData: [
      { day: 'ច', present: 97, absent: 3 },
      { day: 'អ', present: 96, absent: 4 },
      { day: 'ព', present: 98, absent: 2 },
      { day: 'ព្រ', present: 95, absent: 5 },
      { day: 'សុ', present: 97, absent: 3 },
    ],
    trendData: [
      { monthLabel: 'មករា', attendancePct: 92, gradePct: 65 },
      { monthLabel: 'កុម្ភៈ', attendancePct: 94, gradePct: 68 },
      { monthLabel: 'មីនា', attendancePct: 95, gradePct: 70 },
      { monthLabel: 'មេសា', attendancePct: 93, gradePct: 71 },
      { monthLabel: 'ឧសភា', attendancePct: 96, gradePct: 75 },
      { monthLabel: 'មិថុនា', attendancePct: 97, gradePct: 78 },
    ],
    tableData: [
      { grade: 'ថ្នាក់ទី 12', classes: 5, students: 245, att: 98.2, gpa: '3.65', ab: 72.4, eval: 'ល្អប្រសើរ' },
      { grade: 'ថ្នាក់ទី 11', classes: 6, students: 260, att: 96.5, gpa: '3.40', ab: 64.0, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 10', classes: 6, students: 285, att: 95.8, gpa: '3.35', ab: 58.5, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 9', classes: 6, students: 290, att: 96.0, gpa: '3.28', ab: 55.0, eval: 'មធ្យមល្អ' },
      { grade: 'ថ្នាក់ទី 8', classes: 5, students: 130, att: 94.5, gpa: '3.10', ab: 48.0, eval: 'មធ្យម' },
      { grade: 'ថ្នាក់ទី 7', classes: 5, students: 135, att: 97.0, gpa: '3.50', ab: 68.0, eval: 'ល្អ' },
    ]
  },
  'sem2-2026': {
    students: '1,348',
    attendance: '97.5',
    gpa: '3.55',
    atRisk: '28',
    girls: '687',
    boys: '661',
    weeklyData: [
      { day: 'ច', present: 98, absent: 2 },
      { day: 'អ', present: 97, absent: 3 },
      { day: 'ព', present: 99, absent: 1 },
      { day: 'ព្រ', present: 96, absent: 4 },
      { day: 'សុ', present: 98, absent: 2 },
    ],
    trendData: [
      { monthLabel: 'កក្កដា', attendancePct: 97, gradePct: 76 },
      { monthLabel: 'សីហា', attendancePct: 98, gradePct: 79 },
      { monthLabel: 'កញ្ញា', attendancePct: 96, gradePct: 80 },
      { monthLabel: 'តុលា', attendancePct: 95, gradePct: 78 },
      { monthLabel: 'វិច្ឆិកា', attendancePct: 98, gradePct: 82 },
      { monthLabel: 'ធ្នូ', attendancePct: 99, gradePct: 85 },
    ],
    tableData: [
      { grade: 'ថ្នាក់ទី 12', classes: 5, students: 245, att: 99.1, gpa: '3.80', ab: 82.4, eval: 'ល្អប្រសើរ' },
      { grade: 'ថ្នាក់ទី 11', classes: 6, students: 260, att: 97.5, gpa: '3.55', ab: 70.0, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 10', classes: 6, students: 286, att: 96.8, gpa: '3.45', ab: 62.5, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 9', classes: 6, students: 290, att: 97.0, gpa: '3.40', ab: 60.0, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 8', classes: 5, students: 131, att: 95.5, gpa: '3.25', ab: 52.0, eval: 'មធ្យមល្អ' },
      { grade: 'ថ្នាក់ទី 7', classes: 5, students: 136, att: 98.0, gpa: '3.65', ab: 72.0, eval: 'ល្អប្រសើរ' },
    ]
  },
  'annual-2026': {
    students: '1,348',
    attendance: '97.1',
    gpa: '3.48',
    atRisk: '35',
    girls: '687',
    boys: '661',
    weeklyData: [
      { day: 'ច', present: 97, absent: 3 },
      { day: 'អ', present: 96, absent: 4 },
      { day: 'ព', present: 98, absent: 2 },
      { day: 'ព្រ', present: 95, absent: 5 },
      { day: 'សុ', present: 97, absent: 3 },
    ],
    trendData: [
      { monthLabel: 'មករា', attendancePct: 92, gradePct: 65 },
      { monthLabel: 'មីនា', attendancePct: 95, gradePct: 70 },
      { monthLabel: 'ឧសភា', attendancePct: 96, gradePct: 75 },
      { monthLabel: 'កក្កដា', attendancePct: 97, gradePct: 76 },
      { monthLabel: 'កញ្ញា', attendancePct: 96, gradePct: 80 },
      { monthLabel: 'ធ្នូ', attendancePct: 99, gradePct: 85 },
    ],
    tableData: [
      { grade: 'ថ្នាក់ទី 12', classes: 5, students: 245, att: 98.6, gpa: '3.72', ab: 77.4, eval: 'ល្អប្រសើរ' },
      { grade: 'ថ្នាក់ទី 11', classes: 6, students: 260, att: 97.0, gpa: '3.47', ab: 67.0, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 10', classes: 6, students: 286, att: 96.3, gpa: '3.40', ab: 60.5, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 9', classes: 6, students: 290, att: 96.5, gpa: '3.34', ab: 57.5, eval: 'មធ្យមល្អ' },
      { grade: 'ថ្នាក់ទី 8', classes: 5, students: 131, att: 95.0, gpa: '3.17', ab: 50.0, eval: 'មធ្យម' },
      { grade: 'ថ្នាក់ទី 7', classes: 5, students: 136, att: 97.5, gpa: '3.57', ab: 70.0, eval: 'ល្អ' },
    ]
  }
};

type TermKey = keyof typeof MOCK_TERMS;

export default function PrincipalReportsPage() {
  const { profile } = useAuth();
  const [selectedTerm, setSelectedTerm] = useState<TermKey>('sem1-2026');
  const [showEwsModal, setShowEwsModal] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [liveData, setLiveData] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      const data = await fetchPrincipalDashboardData();
      if (data) {
        setLiveData(data);
      }
    }
    loadData();
  }, []);

  const currentData = useMemo(() => {
    const base = MOCK_TERMS[selectedTerm];
    if (liveData) {
      return { 
        ...base, 
        trendData: liveData.trendData,
        students: liveData.totalStudents.toString(),
        girls: liveData.girlsCount.toString(),
        boys: liveData.boysCount.toString(),
        attendance: liveData.overallAttendance,
        gpa: liveData.overallGpa,
        atRisk: liveData.atRiskCount.toString(),
        tableData: liveData.tableData
      };
    }
    return base;
  }, [selectedTerm, liveData]);

  const atRiskStudents = liveData?.atRiskList || [
    { id: '101', name: 'សៅ សុភាព', reasons: ['អវត្តមាន ៤ ដងក្នុងខែនេះ', 'ធ្លាក់ពិន្ទុគណិតវិទ្យា (៤៥)'], severity: 'high' as const },
    { id: '102', name: 'ដួង វិចិត្រ', reasons: ['ធ្លាក់ពិន្ទុរូបវិទ្យា និងគីមីវិទ្យា'], severity: 'medium' as const },
    { id: '103', name: 'ម៉ៅ រស្មី', reasons: ['បញ្ហាវិន័យ៖ ឈ្លោះប្រកែកគ្នា'], severity: 'high' as const },
    { id: '104', name: 'កែវ មករា', reasons: ['អវត្តមាន ៧ ថ្ងៃជាប់គ្នា'], severity: 'high' as const }
  ];


  const generateSvgPath = (data: any[], key: 'attendancePct' | 'gradePct') => {
    if (!data || data.length === 0) return '';
    const points = data.map((d: any, i: number) => {
      const x = i * (500 / (data.length - 1 || 1));
      const y = 100 - d[key];
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };

  const attendancePath = generateSvgPath(currentData.trendData, 'attendancePct');
  const gradesPath = generateSvgPath(currentData.trendData, 'gradePct');

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            របាយការណ៍ & ស្ថិតិសាលារៀន
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>វិភាគទិន្នន័យសរុបសម្រាប់៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {profile?.school_code || 'Porieng-2026'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* EWS Alert Symbol */}
          <button 
            onClick={() => setShowEwsModal(true)}
            className="relative p-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-full shadow-sm text-rose-600 transition-all hover:scale-105 active:scale-95 cursor-pointer mr-2"
            title="សិស្សកំពុងប្រឈមហានិភ័យទូទាំងសាលា"
          >
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white flex items-center justify-center text-[9px] font-black rounded-full border border-white">
              {currentData.atRisk}
            </span>
          </button>

          {/* Term Selector */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
            <Calendar className="w-4 h-4 text-[#FFCF59]" />
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as TermKey)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="sem1-2026">ឆមាសទី 1 ឆ្នាំសិក្សា 2025-2026</option>
              <option value="sem2-2026">ឆមាសទី 2 ឆ្នាំសិក្សា 2025-2026</option>
              <option value="annual-2026">សរុបប្រចាំឆ្នាំសិក្សា 2025-2026</option>
            </select>
          </div>

          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-[#155EEF] hover:bg-[#155EEF]/90 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import Master Grades</span>
          </button>
          
          <button
            onClick={() => alert('កំពុងទាញយករហាយការណ៍ PDF...')}
            className="flex items-center justify-center bg-white p-2.5 rounded-full text-slate-600 border border-slate-200/80 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="ទាញយក PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      <MasterGradeImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImportComplete={() => {}} 
      />

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
                <div key={student.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">
                    {student.name.charAt(0)}
                  </div>
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

      {/* 4 Top Stat Cards (Homeroom Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        <Link href="/principal/students" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30 cursor-pointer">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{currentData.students}</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សសរុបទូទាំងសាលា</p>
        </Link>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{currentData.attendance}%</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">អត្រាវត្តមានសរុបមធ្យម</p>
        </div>

        <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{currentData.gpa}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">មធ្យមភាគពិន្ទុ</p>
        </div>

        <button 
          onClick={() => setShowEwsModal(true)}
          className="bg-rose-500 text-left rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-rose-500/20 text-white flex flex-col justify-between min-h-[130px] border border-rose-400/30 cursor-pointer"
        >
          <div className="flex justify-between items-start w-full">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{currentData.atRisk}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-rose-500 transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white group-hover:text-rose-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-rose-100 mt-4">សិស្សប្រឈមហានិភ័យ</p>
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">កម្រិតវត្តមាន និងពិន្ទុមធ្យមទូទាំងសាលា</h3>
              <p className="text-[11px] text-[#64748B] font-medium">ស្ថិតិប្រៀបធៀបប្រចាំខែ</p>
            </div>
            <span className="text-xs font-bold text-[#64748B] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              និន្នាការ
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
                {attendancePath && <path d={attendancePath} fill="none" stroke="#FFCF59" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-[dash_2s_ease-out_forwards]" />}
                {gradesPath && <path d={gradesPath} fill="none" stroke="#155EEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-[dash_2s_ease-out_forwards]" />}
              </svg>
            </div>
            <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[11px] font-extrabold text-[#64748B] px-2">
              {currentData.trendData.map((d: any, i: number) => <span key={i}>{d.monthLabel}</span>)}
            </div>
          </div>
        </div>

        {/* Gender Donut Chart */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-extrabold text-slate-800 text-base">ស្ថិតិសិស្សតាមភេទ</h3>
            <span className="text-xs font-bold text-[#64748B] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              សរុបទូទាំងសាលា
            </span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-40 h-40 rounded-full border-[12px] border-[#FFCF59] border-t-[#155EEF] border-r-[#155EEF] shadow-md flex items-center justify-center relative rotate-45">
              <div className="absolute -rotate-45 flex flex-col items-center">
                <span className="text-[11px] text-[#64748B] font-extrabold uppercase tracking-wider">សរុប</span>
                <span className="text-2xl font-black text-slate-800">{currentData.students}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between px-4 pt-2 border-t border-slate-50 mt-auto">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFCF59]" />
                <span className="text-xs text-[#64748B] font-bold">សិស្សស្រី</span>
              </div>
              <span className="font-extrabold text-slate-800 text-lg">{currentData.girls}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#155EEF]" />
                <span className="text-xs text-[#64748B] font-bold">សិស្សប្រុស</span>
              </div>
              <span className="font-extrabold text-slate-800 text-lg">{currentData.boys}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Grade Performance Breakdown Table */}
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-xs overflow-hidden flex flex-col">
        <div className="p-5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#155EEF]" />
            <span>ការប្រៀបធៀបលទ្ធផលសិក្សាតាមកម្រិតថ្នាក់នីមួយៗ</span>
          </h3>
          <div className="flex gap-2">
            <span className="text-xs font-extrabold text-[#64748B] bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              ទិន្នន័យផ្លូវការ
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-4 px-6">កម្រិតថ្នាក់</th>
                <th className="py-4 px-6 text-center">ចំនួនថ្នាក់សរុប</th>
                <th className="py-4 px-6 text-center">សិស្សសរុប</th>
                <th className="py-4 px-6">អត្រាវត្តមានសរុប (%)</th>
                <th className="py-4 px-6">សិស្សជាប់និទ្ទេស A & B (%)</th>
                <th className="py-4 px-6 text-right">វាយតម្លៃ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-sm font-semibold">
              {currentData.tableData.map((r: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-extrabold text-slate-800 whitespace-nowrap">{r.grade}</td>
                  <td className="py-4 px-6 text-center text-slate-600">{r.classes} ថ្នាក់</td>
                  <td className="py-4 px-6 text-center font-black text-slate-700">{r.students}</td>
                  
                  {/* Attendance Progress Bar */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-full max-w-[120px] bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${r.att >= 95 ? 'bg-emerald-500' : r.att >= 90 ? 'bg-amber-400' : 'bg-rose-500'}`} 
                          style={{ width: `${r.att}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-10">{r.att}%</span>
                    </div>
                  </td>

                  {/* Grades Progress Bar */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-full max-w-[120px] bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full bg-[#155EEF] rounded-full" 
                          style={{ width: `${r.ab}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-10">{r.ab}%</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6 text-right">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wide ${
                      r.eval === 'ល្អប្រសើរ' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      r.eval === 'ល្អ' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      r.eval === 'មធ្យមល្អ' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {r.eval}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* CSS for animating SVG dash (same as homeroom) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          0% { stroke-dasharray: 0, 1000; }
          100% { stroke-dasharray: 1000, 0; }
        }
      `}} />
    </div>
  );
}
