'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3, CalendarCheck, Award, Download, CheckCircle2, Send, FileSpreadsheet, Printer, 
  Home, HeartHandshake, FileText, AlertTriangle, UserPlus, FileSignature, LayoutList, RefreshCw, Eye, ArrowLeft, History
} from 'lucide-react';

type WizardStep = 'IDLE' | 'GENERATING' | 'REVIEW' | 'PREVIEW';

interface ReportData {
  month: string;
  totalStudents: number;
  totalGirls: number;
  attendanceRate: number;
  absentManyTimes: string[];
  weakStudents: string[];
  topStudents: string[];
  disciplineCases: number;
  parentMeetings: number;
  homeVisits: number;
  studentsNeedingSupport: number;
  teacherComments: string;
  requestToPrincipal: string;
  giepEvidence: string;
}

const DEFAULT_REPORT: ReportData = {
  month: 'ខែកក្កដា 2026',
  totalStudents: 45,
  totalGirls: 23,
  attendanceRate: 96.8,
  absentManyTimes: ['កែវ ច័ន្ទធីតា', 'សុខ មករា'],
  weakStudents: ['សៅ សុភាព (គណិត)', 'ម៉ៅ រស្មី (រូបវិទ្យា)'],
  topStudents: ['ខៀវ សុវណ្ណារាជ', 'ចាន់ សុភាព'],
  disciplineCases: 0,
  parentMeetings: 3,
  homeVisits: 4,
  studentsNeedingSupport: 3,
  teacherComments: '',
  requestToPrincipal: '',
  giepEvidence: ''
};

export default function ReportsPage() {
  const { activeClass, profile } = useAuth();
  const [step, setStep] = useState<WizardStep>('IDLE');
  const [report, setReport] = useState<ReportData>(DEFAULT_REPORT);
  const [sending, setSending] = useState(false);
  const [submittedReports, setSubmittedReports] = useState([{ month: 'ខែមិថុនា 2026', date: '30-Jun-2026', status: 'Approved' }]);

  const supabase = createClient();

  const handleGenerate = async () => {
    setStep('GENERATING');
    try {
      const monthPrefix = new Date().toISOString().substring(0, 7); // e.g. "2026-07"
      
      // 1. Fetch Students
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, gender')
        .eq('class_id', activeClass?.id);

      const totalStudents = students ? students.length : 0;
      const totalGirls = students ? students.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length : 0;
      
      // 2. Fetch Attendance (Mock logic for attendance, assuming monthly_attendance_summary or just using fake for now if table missing)
      // Since attendance table might not have easy rate, we'll try to fetch monthly_attendance_summary
      const { data: attendance } = await supabase
        .from('monthly_attendance_summary')
        .select('*')
        .eq('class_id', activeClass?.id)
        .eq('month', monthPrefix);

      let attendanceRate = 100;
      let absentManyTimes: string[] = [];
      if (attendance && attendance.length > 0 && totalStudents > 0) {
        const totalAbsences = attendance.reduce((sum, a) => sum + (a.absent_count || 0), 0);
        const maxPossibleDays = 25; // Approximate school days per month
        const totalPossible = totalStudents * maxPossibleDays;
        attendanceRate = totalPossible > 0 ? Math.max(0, Math.round(((totalPossible - totalAbsences) / totalPossible) * 100)) : 100;
        
        const manyAbsencesIds = attendance.filter(a => (a.absent_count || 0) > 3).map(a => a.student_id);
        if (manyAbsencesIds.length > 0 && students) {
           absentManyTimes = students.filter(s => manyAbsencesIds.includes(s.id)).map(s => s.full_name);
        }
      }

      // 3. Fetch Grades / Report Cards
      const { data: reportCards } = await supabase
        .from('monthly_report_cards')
        .select('*')
        .eq('class_id', activeClass?.id)
        .eq('month', monthPrefix);

      let weakStudents: string[] = [];
      let topStudents: string[] = [];
      if (reportCards && reportCards.length > 0 && students) {
        // Weak students (average < 25)
        const weakIds = reportCards.filter(r => r.average_score < 25).map(r => r.student_id);
        weakStudents = students.filter(s => weakIds.includes(s.id)).map(s => s.full_name);

        // Top students (rank 1, 2, 3)
        const sorted = [...reportCards].sort((a, b) => (a.rank || 999) - (b.rank || 999));
        const topIds = sorted.slice(0, 3).map(r => r.student_id);
        topStudents = students.filter(s => topIds.includes(s.id)).map(s => s.full_name);
      }

      // 4. Fetch Home Visits
      const { data: homeVisitsData } = await supabase
        .from('home_visits')
        .select('*')
        .gte('date', `${monthPrefix}-01`)
        .lte('date', `${monthPrefix}-31`); // crude date filter

      let homeVisits = 0;
      let parentMeetings = 0; // if we want to simulate or fetch this too
      if (homeVisitsData && students) {
        const studentIds = students.map(s => s.id);
        homeVisits = homeVisitsData.filter(v => studentIds.includes(v.student_id)).length;
      }

      setReport({
        month: `ខែ${new Date().getMonth() + 1} ${new Date().getFullYear()}`, // Need a real khmer month mapping
        totalStudents,
        totalGirls,
        attendanceRate,
        absentManyTimes,
        weakStudents,
        topStudents,
        disciplineCases: 0,
        parentMeetings,
        homeVisits,
        studentsNeedingSupport: weakStudents.length,
        teacherComments: 'ជារួមក្នុងខែនេះ អត្រាវត្តមាន និងការសិក្សារបស់សិស្សមានភាពល្អប្រសើរ។',
        giepEvidence: homeVisits > 0 ? `- បានចុះដល់ផ្ទះសិស្ស ${homeVisits} គ្រួសារ` : '- មិនមានទិន្នន័យចុះផ្ទះសិស្សទេ',
        requestToPrincipal: ''
      });
      
      setStep('REVIEW');
    } catch (err) {
      console.error(err);
      alert('មានកំហុសក្នុងការទាញយកទិន្នន័យ។ សូមសាកល្បងម្តងទៀត។');
      setStep('IDLE');
    }
  };

  const handleSendToPrincipal = async () => {
    setSending(true);
    
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: report.month,
          className: activeClass?.name || '12 ក',
          teacherName: profile?.full_name || 'លោកគ្រូ/អ្នកគ្រូ',
          totalStudents: report.totalStudents,
          totalGirls: report.totalGirls,
          attendanceRate: report.attendanceRate,
          disciplineCases: report.disciplineCases,
          homeVisits: report.homeVisits,
          teacherComments: report.teacherComments,
          requestToPrincipal: report.requestToPrincipal
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      setSubmittedReports([{ month: report.month, date: new Date().toLocaleDateString('en-GB'), status: 'Pending' }, ...submittedReports]);
      alert(`✅ បញ្ជូនរបាយការណ៍សរុបប្រចាំ${report.month} ថ្នាក់ ${activeClass?.name || '12 ក'} ទៅកាន់នាយកសាលា (និង Google Sheets) រួចរាល់!`);
      setStep('IDLE');
    } catch (error) {
      console.error('Failed to submit report to Google Sheets:', error);
      alert('មានកំហុសក្នុងការបញ្ជូនទិន្នន័យ។ សូមសាកល្បងម្តងទៀត។');
    } finally {
      setSending(false);
    }
  };

  const handleExportExcel = () => {
    const data = [
      ['សាលា', 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង (គម្រោង GEIP)'],
      ['របាយការណ៍ប្រចាំខែ', report.month],
      ['ថ្នាក់រៀន', activeClass?.name || '12 ក'],
      ['គ្រូបន្ទុកថ្នាក់', profile?.full_name || 'លោកគ្រូ/អ្នកគ្រូ'],
      [''],
      ['ចំណុច', 'លទ្ធផល'],
      ['សិស្សសរុប', `${report.totalStudents} នាក់ (ស្រី ${report.totalGirls})`],
      ['អត្រាវត្តមាន', `${report.attendanceRate}%`],
      ['សិស្សចុះផ្ទះ', `${report.homeVisits} លើក`],
      ['មតិគ្រូ', report.teacherComments],
      ['សំណើ', report.requestToPrincipal],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GEIP Report');
    XLSX.writeFile(wb, `Report_${report.month}.xlsx`);
  };

  // --- Render Steps ---

  if (step === 'IDLE') {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
              <FileSpreadsheet className="w-8 h-8 text-[#155EEF]" />
              <span>របាយការណ៍ស្វ័យប្រវត្តិ</span>
            </h1>
            <p className="text-xs font-bold text-[#64748B] mt-1">ប្រព័ន្ធទាញយកទិន្នន័យវត្តមាន និងពិន្ទុមកចងក្រងជារបាយការណ៍ប្រចាំខែដោយស្វ័យប្រវត្តិ</p>
          </div>
          <button onClick={handleGenerate} className="px-6 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer">
            <RefreshCw className="w-5 h-5" /> ទាញទិន្នន័យបង្កើតរបាយការណ៍ថ្មី
          </button>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs">
          <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" /> ប្រវត្តិរបាយការណ៍ដែលបានបញ្ជូន
          </h2>
          <div className="space-y-3">
            {submittedReports.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-black text-slate-800">របាយការណ៍ប្រចាំ {r.month}</div>
                    <div className="text-xs font-bold text-slate-500">ថ្ងៃបញ្ជូន៖ {r.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-black rounded-full ${r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>{r.status === 'Approved' ? 'ឯកភាពដោយនាយក' : 'កំពុងរង់ចាំ'}</span>
                  <button className="p-2 text-slate-400 hover:text-[#155EEF] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"><Eye className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'GENERATING') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-pulse">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-[#155EEF] rounded-full animate-spin"></div>
          <FileText className="w-6 h-6 text-[#155EEF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900">កំពុងទាញទិន្នន័យ...</h2>
          <p className="text-sm font-bold text-slate-500 mt-2">កំពុងគណនាអត្រាវត្តមាន ពិន្ទុមធ្យម និងចំនួនសិស្សប្រឈមហានិភ័យ</p>
        </div>
      </div>
    );
  }

  if (step === 'REVIEW') {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-amber-500" /> ពិនិត្យទិន្នន័យមុននឹងបញ្ជូន
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">ទិន្នន័យខាងក្រោមត្រូវបានទាញយកដោយស្វ័យប្រវត្តិ។ សូមពិនិត្យ និងបំពេញមតិយោបល់បន្ថែម។</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('IDLE')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-colors cursor-pointer">បោះបង់</button>
            <button onClick={() => setStep('PREVIEW')} className="px-6 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors cursor-pointer">
              <CheckCircle2 className="w-4 h-4" /> រួចរាល់ សូមមើលទម្រង់ដើម
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auto-Calculated Column */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs space-y-6">
            <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#155EEF]" /> ទិន្នន័យគណនាស្វ័យប្រវត្តិ
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">សិស្សសរុប</span>
                <span className="font-black text-slate-900">{report.totalStudents} នាក់ (ស្រី {report.totalGirls})</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-xs font-bold text-blue-600 block mb-1">អត្រាវត្តមានមធ្យម</span>
                <span className="font-black text-[#155EEF]">{report.attendanceRate}%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">សិស្សឈប់ច្រើន (&gt;3ថ្ងៃ)</span>
                <span className="font-black text-rose-600">{report.absentManyTimes.join(', ') || 'គ្មាន'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">សិស្សរៀនខ្សោយខ្លាំង</span>
                <span className="font-black text-amber-600">{report.weakStudents.join(', ') || 'គ្មាន'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">សិស្សពូកែជាងគេ</span>
                <span className="font-black text-emerald-600">{report.topStudents.join(', ')}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">បញ្ហាវិន័យសរុប</span>
                <span className="font-black text-slate-900">{report.disciplineCases} ករណី</span>
              </div>
              <div className="col-span-2 p-3 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
                <span className="text-xs font-bold text-purple-700">សកម្មភាព GEIP (ហៅឪពុកម្តាយ / ចុះផ្ទះសិស្ស)</span>
                <span className="font-black text-purple-800">{report.parentMeetings} លើក / {report.homeVisits} ផ្ទះ</span>
              </div>
            </div>
          </div>

          {/* Teacher Input Column */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-emerald-500" /> បំពេញបន្ថែមដោយគ្រូបន្ទុកថ្នាក់
            </h2>
            
            <label className="block">
              <span className="text-xs font-bold text-slate-600 mb-1.5 block">១. មតិយោបល់ និងការវាយតម្លៃសរុបប្រចាំខែ</span>
              <textarea 
                value={report.teacherComments} 
                onChange={(e) => setReport({...report, teacherComments: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-[#155EEF] transition-colors h-24"
                placeholder="សូមសរសេរមតិយោបល់របស់អ្នកអំពីការវិវឌ្ឍន៍របស់សិស្សក្នុងខែនេះ..."
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600 mb-1.5 block">២. ភស្តុតាងសកម្មភាពគាំពារ GEIP (GIEP Evidence)</span>
              <textarea 
                value={report.giepEvidence} 
                onChange={(e) => setReport({...report, giepEvidence: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-[#155EEF] transition-colors h-20"
                placeholder="តើលោកគ្រូអ្នកគ្រូបានធ្វើសកម្មភាពអ្វីខ្លះដើម្បីជួយសិស្ស? (ឧទាហរណ៍៖ ចុះផ្ទះ បំប៉ន)"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600 mb-1.5 block">៣. ចំនួនករណីវិន័យ</span>
              <input 
                type="number"
                min="0"
                value={report.disciplineCases} 
                onChange={(e) => setReport({...report, disciplineCases: parseInt(e.target.value) || 0})}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-[#155EEF] transition-colors"
                placeholder="ចំនួនករណីវិន័យ"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600 mb-1.5 block">៤. សំណូមពរដល់នាយកសាលា</span>
              <textarea 
                value={report.requestToPrincipal} 
                onChange={(e) => setReport({...report, requestToPrincipal: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-[#155EEF] transition-colors h-20"
                placeholder="តើលោកគ្រូអ្នកគ្រូមានសំណូមពរអ្វីដល់គណៈគ្រប់គ្រងសាលាដែរឬទេ?"
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // STEP: PREVIEW
  return (
    <div className="space-y-6 animate-fadeIn pb-12 print:m-0 print:p-0 print:bg-white print:text-black print:absolute print:inset-0">
      {/* Top Banner */}
      <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-100/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-blue-50 text-[#155EEF] px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border border-blue-100/60 shadow-2xs cursor-pointer" onClick={() => setStep('REVIEW')}>
            <ArrowLeft className="w-4 h-4" />
            <span>កែប្រែទិន្នន័យឡើងវិញ</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            របាយការណ៍សង្ខេបគ្រូបន្ទុកថ្នាក់
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleExportExcel} className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-black border border-slate-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />ទាញយក Excel
          </button>
          <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-black border border-slate-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer">
            <Printer className="w-4 h-4 text-[#155EEF]" />បោះពុម្ព PDF
          </button>
          <button onClick={handleSendToPrincipal} disabled={sending} className="px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 bg-[#155EEF] hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer">
            <Send className="w-4 h-4" />{sending ? 'កំពុងបញ្ជូន...' : '📤 បញ្ជូនទៅនាយកសាលា'}
          </button>
        </div>
      </div>

      {/* Official Print Header */}
      <div className="hidden print:block text-center space-y-1 pb-6 border-b-2 border-slate-900">
        <div className="text-sm font-extrabold text-slate-800">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div className="text-sm font-black text-slate-900">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        <div className="pt-2 text-xs font-bold text-slate-700">ក្រសួងអប់រំ យុវជន និងកីឡា • គម្រោងកែលម្អការអប់រំចំណេះទូទៅ</div>
        <div className="text-base font-black text-slate-900">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង • របាយការណ៍សរុបគ្រូបន្ទុកថ្នាក់</div>
        <div className="text-xs font-bold text-slate-600">ថ្នាក់រៀន៖ {activeClass?.name || '12 ក'} • ប្រចាំ{report.month}</div>
      </div>

      {/* Main Print Layout */}
      <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-2xs space-y-8 print:shadow-none print:border-none print:rounded-none">
        
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 mb-3">១. ទិន្នន័យទូទៅ និងវត្តមាន</h3>
            <ul className="text-sm font-bold text-slate-700 space-y-2">
              <li className="flex justify-between">សិស្សសរុប <span>{report.totalStudents} នាក់ (ស្រី {report.totalGirls})</span></li>
              <li className="flex justify-between text-[#155EEF] font-black">អត្រាវត្តមានមធ្យម <span>{report.attendanceRate}%</span></li>
              <li className="flex justify-between">សិស្សអវត្តមានច្រើន <span>{report.absentManyTimes.join(', ') || 'គ្មាន'}</span></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 mb-3">២. ការសិក្សា និងវិន័យ</h3>
            <ul className="text-sm font-bold text-slate-700 space-y-2">
              <li className="flex justify-between">សិស្សពូកែ <span>{report.topStudents.join(', ')}</span></li>
              <li className="flex justify-between text-rose-600">សិស្សខ្សោយខ្លាំង <span>{report.weakStudents.join(', ')}</span></li>
              <li className="flex justify-between">ករណីវិន័យ <span>{report.disciplineCases} ករណី</span></li>
            </ul>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 mb-3">៣. សកម្មភាពគាំពារ GEIP (SBM)</h3>
          <ul className="text-sm font-bold text-slate-700 space-y-2">
            <li className="flex justify-between w-1/2">អញ្ជើញអាណាព្យាបាលប្រជុំ <span>{report.parentMeetings} លើក</span></li>
            <li className="flex justify-between w-1/2">ចុះសួរសុខទុក្ខដល់ផ្ទះ <span>{report.homeVisits} ផ្ទះ</span></li>
            <li className="mt-2 text-slate-600 italic">
              <strong>ភស្តុតាង និងសកម្មភាពលម្អិត៖</strong> <br/>
              <span className="whitespace-pre-line">{report.giepEvidence || '-'}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 mb-3">៤. មតិយោបល់ និងសំណូមពរ</h3>
          <div className="space-y-4 text-sm font-bold text-slate-700">
            <div>
              <strong>មតិយោបល់គ្រូ៖</strong>
              <p className="mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line print:bg-transparent print:border-none print:p-0">{report.teacherComments}</p>
            </div>
            <div>
              <strong>សំណូមពរ៖</strong>
              <p className="mt-1 bg-amber-50 p-3 rounded-lg border border-amber-100 whitespace-pre-line print:bg-transparent print:border-none print:p-0">{report.requestToPrincipal}</p>
            </div>
          </div>
        </div>

        {/* Signatures for Print */}
        <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-center text-sm font-bold text-slate-800">
          <div className="space-y-16">
            <div>បានឃើញ និងឯកភាព<br/>នាយកវិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</div>
            <div className="border-t border-slate-400 pt-1 font-black mx-12">នាយកសាលា</div>
          </div>
          <div className="space-y-16">
            <div>ធ្វើនៅថ្ងៃទី........ខែ............ឆ្នាំ 2026<br/>គ្រូបន្ទុកថ្នាក់</div>
            <div className="border-t border-slate-400 pt-1 font-black mx-12">{profile?.full_name || 'លោកគ្រូ/អ្នកគ្រូ សុខា'}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
