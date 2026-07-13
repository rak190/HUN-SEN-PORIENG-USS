'use client';

import React, { useState } from 'react';
import { BookOpen, Clock, Printer, Download, Users, Activity, TrendingUp, BarChart3, Calendar, User } from 'lucide-react';
import { INITIAL_STUDENTS } from '@/app/(dashboard)/students/page';
import ClassSchedule from '@/components/classes/ClassSchedule';

export default function ClassInfoPage() {
  const [activeTab, setActiveTab] = useState<'info' | 'stats'>('info');
  
  const students = INITIAL_STUDENTS;
  const activeClass = { name: '១២ ក' };

  return (
    <div className="p-6 space-y-6 animate-fadeIn pb-12 print:p-0 print:space-y-0 print:pb-0 print:font-siemreap [&_h1]:print:font-moul [&_h2]:print:font-moul [&_h3]:print:font-moul [&_h4]:print:font-moul">
      {/* Header with Sub-tabs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6 print:hidden">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#155EEF]" /> ព័ត៌មានថ្នាក់រៀន
          </h2>
          
          {/* Sub-tabs (Pill Menu) print:hidden */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit print:hidden">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'info' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              ព័ត៌មានទូទៅ (General Info)
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'stats' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> ស្ថិតិ (Statistics)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden shrink-0 self-start sm:self-auto mt-2 sm:mt-0">
          <button 
            onClick={() => alert('មុខងារទាញយក Excel នឹងរួចរាល់ឆាប់ៗនេះ')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition-colors border border-slate-200 cursor-pointer"
          >
            <Download className="w-4 h-4" /> ទាញយក Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> បោះពុម្ព
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <>
        {/* ================= GENERAL INFO TAB ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
          {/* Class Details */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl md:rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col gap-3 group hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 relative z-10 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1">ថ្នាក់រៀន (Class)</p>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                {activeClass?.name || '១២ ក'} <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Grade 12</span>
              </h3>
            </div>
          </div>

          {/* Academic Year */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl md:rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col gap-3 group hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 relative z-10 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1">ឆ្នាំសិក្សា (Year)</p>
              <h3 className="text-sm sm:text-base font-black text-slate-900">2026-2027</h3>
            </div>
          </div>

          {/* Homeroom Teacher */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl md:rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col gap-3 group hover:shadow-md transition-shadow relative overflow-hidden col-span-2 sm:col-span-1">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 relative z-10 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1">គ្រូបន្ទុកថ្នាក់ (Teacher)</p>
              <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">លោកគ្រូ/អ្នកគ្រូ សុខា</h3>
            </div>
          </div>

          {/* Students Stats */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl md:rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col gap-3 group hover:shadow-md transition-shadow relative overflow-hidden col-span-2 sm:col-span-1">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex justify-between items-start relative z-10 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500">ស្រី: <span className="text-slate-900">{students.filter(s => s.gender === 'F').length}</span></p>
                <p className="text-[10px] font-bold text-slate-500">ប្រធាន: <span className="text-[#155EEF]">ធីតា</span></p>
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1">សិស្សសរុប (Total)</p>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-baseline gap-1">
                {students.length} <span className="text-[10px] font-bold text-slate-500">នាក់</span>
              </h3>
            </div>
          </div>
        </div>
        <ClassSchedule />
      </>
      ) : (
        /* ================= STATISTICS TAB ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {/* Gender Breakdown */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> សមាមាត្រសិស្ស (Gender)
            </h3>
            <div className="flex items-end justify-center h-32 gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 bg-blue-500 rounded-t-xl" style={{ height: '70px' }}></div>
                <span className="text-xs font-black text-slate-600">ប្រុស ({students.length - students.filter(s => s.gender === 'F').length})</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 bg-pink-500 rounded-t-xl" style={{ height: '90px' }}></div>
                <span className="text-xs font-black text-slate-600">ស្រី ({students.filter(s => s.gender === 'F').length})</span>
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 w-full">
              <Activity className="w-5 h-5 text-emerald-500" /> អត្រាវត្តមាន (Attendance)
            </h3>
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-emerald-500" strokeDasharray="94, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute text-3xl font-black text-slate-900">94<span className="text-base text-slate-500">%</span></div>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-4 text-center">អត្រាវត្តមានមធ្យមប្រចាំខែនេះ</p>
          </div>

          {/* Academic Performance */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> លទ្ធផលសិក្សា (Academics)
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-black text-slate-700 mb-1">
                  <span>សិស្សជាប់ (Pass)</span>
                  <span className="text-emerald-600">85%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-black text-slate-700 mb-1">
                  <span>សិស្សធ្លាក់ (Fail)</span>
                  <span className="text-rose-600">15%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500">មុខវិជ្ជាដែលសិស្សធ្លាក់ច្រើនជាងគេ៖ <span className="text-rose-600 font-black">គណិតវិទ្យា (១២នាក់)</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
