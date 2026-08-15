'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Download, Search, Calendar, BarChart3, 
  FileText, ArrowDownToLine, CheckCircle2, Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

const AVAILABLE_REPORTS = [
  {
    id: 'REP-01',
    title: 'សរុបស្ថិតិសិស្សដើមឆ្នាំ',
    category: 'របាយការណ៍ដើមឆ្នាំ',
    description: 'ស្ថិតិសិស្សសរុប ស្រី កម្រិតថ្នាក់ និងប្រភេទសិស្ស (ថ្មី, ត្រួតថ្នាក់) សម្រាប់ផ្ញើទៅមន្ទីរអប់រំ។',
    lastUpdated: '10 តុលា 2025',
    type: 'Excel'
  },
  {
    id: 'REP-02',
    title: 'របាយការណ៍អវត្តមានប្រចាំខែ',
    category: 'របាយការណ៍ប្រចាំខែ',
    description: 'សរុបអវត្តមានសិស្ស និងគ្រូបង្រៀនប្រចាំខែនីមួយៗ តាមទម្រង់ក្រសួង។',
    lastUpdated: '01 វិច្ឆិកា 2025',
    type: 'Excel'
  },
  {
    id: 'REP-03',
    title: 'បញ្ជីរាយនាមសិស្សប្រលងឆមាសទី១',
    category: 'របាយការណ៍ឆមាស',
    description: 'តារាងឈ្មោះសិស្ស និងពិន្ទុសម្រាប់ការប្រលងឆមាសទី១ (ទម្រង់ PDF ផ្លូវការ)។',
    lastUpdated: '15 មករា 2026',
    type: 'PDF'
  },
  {
    id: 'REP-04',
    title: 'ស្ថិតិគ្រូបង្រៀន និងបុគ្គលិក',
    category: 'របាយការណ៍រដ្ឋបាល',
    description: 'ចំនួនគ្រូបង្រៀន បុគ្គលិកអប់រំ តាមកម្រិតវប្បធម៌ និងមុខវិជ្ជាឯកទេស។',
    lastUpdated: '20 តុលា 2025',
    type: 'Excel'
  }
];

export default function MoeysReportsPage() {
  const [academicYear, setAcademicYear] = useState('2025-2026');
  
  // Default to current month for the month picker (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  
  const [reports, setReports] = useState(AVAILABLE_REPORTS);
  const [sem1GradesData, setSem1GradesData] = useState<any[]>([]);

  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const handleDownload = async (reportId: string, title: string) => {
    setGeneratingReportId(reportId);
    try {
      if (reportId === 'REP-01') {
        await generateStudentStatsExcel();
      } else if (reportId === 'REP-02') {
        await generateMonthlyAttendanceExcel();
      } else if (reportId === 'REP-03') {
        await generateSemester1GradesPDF();
      } else if (reportId === 'REP-04') {
        await generateTeacherStatsExcel();
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      alert('មានបញ្ហាក្នុងការទាញយករបាយការណ៍ (Error): ' + err.message);
    } finally {
      setGeneratingReportId(null);
    }
  };

  const generateStudentStatsExcel = async () => {
    // REP-01: Students joined with classes
    const { data: students, error } = await supabase
      .from('students')
      .select('*, classes(name, grade)');
      
    if (error) throw error;
    
    // Format data for MoEYS standard
    const excelData = students.map((s: any, index: number) => ({
      'ល.រ (No.)': index + 1,
      'អត្តលេខសិស្ស (Student ID)': s.student_id_number || 'N/A',
      'គោត្តនាម និងនាម (Full Name)': s.full_name,
      'ភេទ (Gender)': s.gender,
      'ថ្ងៃខែឆ្នាំកំណើត (DOB)': s.dob || 'N/A',
      'ថ្នាក់រៀន (Class)': s.classes?.name || 'N/A',
      'កម្រិតថ្នាក់ (Grade)': s.classes?.grade || 'N/A',
      'លេខទូរស័ព្ទអាណាព្យាបាល (Parent Phone)': s.parent_phone || 'N/A',
      'ស្ថានភាព (Status)': s.is_active ? 'កំពុងសិក្សា' : 'បោះបង់ការសិក្សា'
    }));

    exportToExcel(excelData, 'សរុបស្ថិតិសិស្សដើមឆ្នាំ_REP-01');
  };

  const generateMonthlyAttendanceExcel = async () => {
    // REP-02: Attendance for selected month
    const [yearStr, monthStr] = selectedMonth.split('-');
    const startDate = `${yearStr}-${monthStr}-01`;
    const endDate = new Date(Number(yearStr), Number(monthStr), 0).toISOString().split('T')[0];

    const { data: attendance, error } = await supabase
      .from('attendance_records')
      .select('*, students(full_name, gender, student_id_number), classes(name)')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    // Aggregate by student
    const studentMap = new Map();
    
    attendance.forEach((record: any) => {
      const sId = record.student_id;
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          student_id: record.students?.student_id_number,
          full_name: record.students?.full_name,
          gender: record.students?.gender,
          class_name: record.classes?.name,
          absent_count: 0,
          permission_count: 0,
          late_count: 0
        });
      }
      
      const stat = studentMap.get(sId);
      if (record.status === 'absent' || record.status === 'A') stat.absent_count++;
      else if (record.status === 'permission' || record.status === 'P') stat.permission_count++;
      else if (record.status === 'late' || record.status === 'L') stat.late_count++;
    });

    const excelData = Array.from(studentMap.values()).map((s: any, index: number) => ({
      'ល.រ (No.)': index + 1,
      'អត្តលេខសិស្ស (ID)': s.student_id || 'N/A',
      'ឈ្មោះសិស្ស (Name)': s.full_name,
      'ភេទ (Gender)': s.gender,
      'ថ្នាក់ (Class)': s.class_name || 'N/A',
      'ច្បាប់ (Permission)': s.permission_count,
      'ឥតច្បាប់ (Absent)': s.absent_count,
      'យឺត (Late)': s.late_count,
      'សរុបអវត្តមាន (Total Absent)': s.permission_count + s.absent_count
    }));

    exportToExcel(excelData, `របាយការណ៍អវត្តមាន_${selectedMonth}_REP-02`);
  };

  const generateSemester1GradesPDF = async () => {
    // REP-03: Semester 1 Grades (PDF via Canvas)
    const { data: grades, error } = await supabase
      .from('grades')
      .select('*, students(full_name, gender, student_id_number), classes(name)')
      .eq('period', 'sem1-exam')
      .order('total_score', { ascending: false });

    if (error) throw error;

    // Set data so the hidden div renders it
    setSem1GradesData(grades || []);
    
    // We need to wait for React to render the hidden div
    await new Promise(resolve => setTimeout(resolve, 500));

    if (pdfTemplateRef.current) {
      try {
        const dataUrl = await toPng(pdfTemplateRef.current, { 
          quality: 1, 
          pixelRatio: 2, 
          backgroundColor: '#ffffff',
          style: { display: 'block' } // temporarily make visible for capture
        });
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (pdfTemplateRef.current.offsetHeight * pdfWidth) / pdfTemplateRef.current.offsetWidth;
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('បញ្ជីរាយនាមសិស្សប្រលងឆមាសទី១_REP-03.pdf');
      } catch (captureErr) {
        console.error("Failed to capture PDF:", captureErr);
        alert("បរាជ័យក្នុងការបង្កើត PDF");
      }
    }
  };

  const generateTeacherStatsExcel = async () => {
    // REP-04: Staff & Teachers
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['teacher', 'principal', 'admin']);
      
    if (error) throw error;

    const excelData = profiles.map((p: any, index: number) => ({
      'ល.រ (No.)': index + 1,
      'ឈ្មោះ (Full Name)': p.full_name,
      'តួនាទី (Role)': p.role === 'teacher' ? 'គ្រូបង្រៀន' : (p.role === 'principal' ? 'នាយកសាលា' : 'អ្នកគ្រប់គ្រង'),
      'កូដសាលា (School Code)': p.school_code || 'N/A'
    }));

    exportToExcel(excelData, 'ស្ថិតិគ្រូបង្រៀន_បុគ្គលិក_REP-04');
  };

  const exportToExcel = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("មិនមានទិន្នន័យសម្រាប់របាយការណ៍នេះទេ (No data found).");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const filteredReports = reports.filter(rep => 
    rep.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    rep.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-[#155EEF]" />
            របាយការណ៍ក្រសួង (MoEYS Reports)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            ទាញយករបាយការណ៍តាមស្ដង់ដារប្រព័ន្ធ SIS សម្រាប់ផ្ញើទៅមន្ទីរអប់រំ។
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Month Picker */}
          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent text-sm font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="2025-2026">ឆ្នាំសិក្សា ២០២៥ - ២០២៦</option>
              <option value="2024-2025">ឆ្នាំសិក្សា ២០២៤ - ២០២៥</option>
            </select>
          </div>
        </div>
      </header>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#155EEF]/10 text-[#155EEF] rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">របាយការណ៍សរុប</h3>
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900">{reports.length}</div>
            <p className="text-xs text-slate-500 font-bold mt-1">មានស្រាប់ក្នុងប្រព័ន្ធ</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">ត្រៀមរួចរាល់</h3>
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900">១០០%</div>
            <p className="text-xs text-slate-500 font-bold mt-1">ភ្ជាប់ជាមួយទិន្នន័យពិត (Live DB)</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</h3>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 mt-2">ថ្ងៃនេះ (Real-time)</div>
            <p className="text-xs text-slate-500 font-bold mt-1">ទាញយកភ្លាមៗ</p>
          </div>
        </div>
      </div>

      {/* Report List */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#155EEF]" />
            គំរូររបាយការណ៍ (Report Templates)
          </h2>
          <div className="relative w-full sm:w-72 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#155EEF] transition-colors" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះរបាយការណ៍..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-full py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-block px-3 py-1 bg-[#155EEF]/10 text-[#155EEF] text-[10px] font-black uppercase rounded-full border border-[#155EEF]/20">
                      {report.category}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                      report.type === 'Excel' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {report.type === 'Excel' ? <FileSpreadsheet className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {report.type}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-[#155EEF] transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    {report.description}
                  </p>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {report.lastUpdated}
                  </div>
                  <button 
                    onClick={() => handleDownload(report.id, report.title)}
                    disabled={generatingReportId !== null}
                    className="px-4 py-2 bg-[#155EEF]/10 hover:bg-[#155EEF] hover:text-white text-[#155EEF] font-bold text-xs rounded-full transition-all flex items-center gap-2 group-hover:shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {generatingReportId === report.id ? (
                      <>កំពុងទាញយក...</>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-4 h-4" /> ទាញយក
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
            
            {filteredReports.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-slate-500 font-bold">រកមិនឃើញរបាយការណ៍ "{searchQuery}" ទេ</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Div for PDF Generation (REP-03) */}
      <div className="overflow-hidden h-0 w-0 absolute left-[-9999px]">
        <div 
          ref={pdfTemplateRef} 
          className="bg-white p-12 text-slate-900 w-[794px]" 
          style={{ minHeight: '1123px' }} // A4 size in pixels roughly at 96 DPI
        >
          <div className="text-center space-y-2 mb-10">
            <h1 className="text-2xl font-black text-black">ព្រះរាជាណាចក្រកម្ពុជា</h1>
            <h2 className="text-xl font-bold text-black">ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
            <div className="flex justify-center my-4">
              <div className="w-32 h-[1px] bg-black"></div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-bold text-black">បញ្ជីរាយនាមសិស្ស និងលទ្ធផលប្រលងឆមាសទី១</h3>
            <p className="text-sm font-semibold text-slate-700 mt-2">ឆ្នាំសិក្សា: {academicYear}</p>
          </div>

          <table className="w-full border-collapse border border-black mb-8">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-2 text-sm font-bold">ល.រ</th>
                <th className="border border-black p-2 text-sm font-bold text-left">អត្តលេខ</th>
                <th className="border border-black p-2 text-sm font-bold text-left">គោត្តនាម និងនាម</th>
                <th className="border border-black p-2 text-sm font-bold text-center">ភេទ</th>
                <th className="border border-black p-2 text-sm font-bold text-center">ថ្នាក់</th>
                <th className="border border-black p-2 text-sm font-bold text-center">ពិន្ទុសរុប</th>
              </tr>
            </thead>
            <tbody>
              {sem1GradesData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black p-4 text-center text-sm font-semibold">មិនមានទិន្នន័យ</td>
                </tr>
              ) : (
                sem1GradesData.map((grade, index) => (
                  <tr key={grade.id}>
                    <td className="border border-black p-2 text-sm text-center">{index + 1}</td>
                    <td className="border border-black p-2 text-sm">{grade.students?.student_id_number || 'N/A'}</td>
                    <td className="border border-black p-2 text-sm">{grade.students?.full_name}</td>
                    <td className="border border-black p-2 text-sm text-center">{grade.students?.gender}</td>
                    <td className="border border-black p-2 text-sm text-center">{grade.classes?.name}</td>
                    <td className="border border-black p-2 text-sm text-center font-bold">{grade.total_score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div className="flex justify-end mt-12 pr-12">
            <div className="text-center">
              <p className="text-sm font-bold text-black mb-24">នាយកសាលា</p>
              <p className="text-sm font-bold text-black">ហត្ថលេខា និងត្រា</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
