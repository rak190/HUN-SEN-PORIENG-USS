'use client';

import React, { useState } from 'react';
import MonthlyAttendanceForm from '@/components/attendance/MonthlyAttendanceForm';
import AttendanceInsights from '@/components/attendance/AttendanceInsights';
import { ClipboardCheck, Users, CalendarDays, LayoutList, Printer, Download, AlertTriangle, History } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function AttendancePage() {
  const { activeClass } = useAuth();
  const [activeTab, setActiveTab] = useState<'ews' | 'history' | 'monthly'>('ews');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <ClipboardCheck className="w-8 h-8 text-[#155EEF]" />
            <span>វត្តមានសិស្ស</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1 flex items-center gap-1.5">
            <span>ថ្នាក់រៀន៖</span>
            <span className="font-extrabold text-[#155EEF] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              {activeClass?.name || '10A'}
            </span>
            <span>• គ្រប់គ្រងអវត្តមាន និងប្រព័ន្ធប្រកាសអាសន្នទប់ស្កាត់ការបោះបង់ការសិក្សា</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 print:hidden shrink-0 mt-4 sm:mt-0">
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

      {/* Tab Menu */}
      <div className="overflow-x-auto print:hidden pb-2">
        <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl w-max border border-white/60 shadow-sm">
          {[
            { id: 'ews', label: 'ការព្រមានមុន', icon: AlertTriangle },
            { id: 'history', label: 'ប្រវត្តិបញ្ជូនវត្តមាន', icon: History },
            { id: 'monthly', label: 'បញ្ចូលវត្តមាន', icon: LayoutList },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${activeTab === id ? 'bg-white text-[#155EEF] shadow-md shadow-slate-200/50 scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'ews' && <AttendanceInsights mode="alerts" />}
      {activeTab === 'history' && <AttendanceInsights mode="history" />}
      {activeTab === 'monthly' && <MonthlyAttendanceForm />}
    </div>
  );
}
