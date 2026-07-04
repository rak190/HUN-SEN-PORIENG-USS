'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Student } from '@/types';
import { CURRICULUM_SCHEMAS } from '@/lib/curriculum';
import * as XLSX from 'xlsx';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Award,
  Download
} from 'lucide-react';
import Link from 'next/link';

const DEMO_STUDENTS: Student[] = [
  { id: 'std-1', class_id: 'demo-class-1', student_id_number: 'ID-001', full_name: 'កែវ ច័ន្ទធីតា', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-2', class_id: 'demo-class-1', student_id_number: 'ID-002', full_name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-3', class_id: 'demo-class-1', student_id_number: 'ID-003', full_name: 'ចាន់ សុភាព', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-4', class_id: 'demo-class-1', student_id_number: 'ID-004', full_name: 'ដួង រដ្ឋា', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-5', class_id: 'demo-class-1', student_id_number: 'ID-005', full_name: 'ទិត្យ វិសាល', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-6', class_id: 'demo-class-1', student_id_number: 'ID-006', full_name: 'ប៊ុន រស្មី', gender: 'F', is_active: true, created_at: new Date().toISOString() },
];

export default function ReportCardsPage() {
  const { activeClass } = useAuth();
  const [students] = useState<Student[]>(DEMO_STUDENTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('sem-1');
  
  const activeSchema = CURRICULUM_SCHEMAS['upper-sec-sci'];
  const maxTotalScore = activeSchema.subjects.reduce((sum, sub) => sum + sub.maxScore, 0);

  // Generate consistent demo scores for ALL students for batch printing and export
  const demoMatrixData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    students.forEach((std, i) => {
      data[std.id] = {};
      const isTopStudent = i === 0 || i === 2; // Fake top students
      const basePercent = isTopStudent ? 0.85 : 0.55 + (Math.random() * 0.1);
      
      // GEIP Sub-metrics
      data[std.id]['khmer_dictation'] = Math.floor(40 * basePercent) + Math.floor(Math.random() * 4);
      data[std.id]['khmer_composition'] = Math.floor(60 * basePercent) + Math.floor(Math.random() * 8);
      data[std.id]['khmer_reading_speed'] = 80 + Math.floor(Math.random() * 30); 

      activeSchema.subjects.forEach(sub => {
         data[std.id][sub.id] = Math.min(sub.maxScore, Math.floor(sub.maxScore * basePercent) + Math.floor(Math.random() * (sub.maxScore * 0.1)));
      });
    });
    return data;
  }, [students, activeSchema]);

  // Calculate ranks
  const rankedStudents = useMemo(() => {
    return [...students].map(std => {
      const scores = demoMatrixData[std.id];
      const totalScore = activeSchema.subjects.reduce((sum, sub) => sum + (scores[sub.id] || 0), 0);
      const percentage = (totalScore / maxTotalScore) * 100;
      let grade = 'F';
      if (percentage >= 90) grade = 'A';
      else if (percentage >= 80) grade = 'B';
      else if (percentage >= 70) grade = 'C';
      else if (percentage >= 60) grade = 'D';
      else if (percentage >= 50) grade = 'E';

      return { ...std, totalScore, percentage, grade };
    }).sort((a, b) => b.totalScore - a.totalScore)
      .map((std, idx) => ({ ...std, rank: idx + 1 }));
  }, [students, demoMatrixData, activeSchema, maxTotalScore]);

  const currentStudent = rankedStudents.find(s => s.id === students[currentIndex].id);

  const handlePrint = () => {
    window.print();
  };

  const handleExportGEIP = () => {
    const wsData = rankedStudents.map((std) => {
      const scores = demoMatrixData[std.id];
      
      const row: any = {
        'អត្តលេខ': std.student_id_number,
        'នាមត្រកូល និងនាមខ្លួន': std.full_name,
        'ភេទ': std.gender === 'F' ? 'ស្រី' : 'ប្រុស',
        'ថ្នាក់ទី': activeClass?.name || '10A',
        'សរសេរតាមអាន': scores['khmer_dictation'] || 0,
        'តែងសេចក្តី': scores['khmer_composition'] || 0,
        'ល្បឿនអំណាន': scores['khmer_reading_speed'] || 0,
      };

      activeSchema.subjects.forEach(sub => {
        row[sub.label] = scores[sub.id] || 0;
      });

      row['ពិន្ទុសរុប'] = std.totalScore;
      row['និទ្ទេសប្រចាំខែ'] = std.grade;
      row['ចំណាត់ថ្នាក់'] = std.rank;

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GEIP Data");
    XLSX.writeFile(wb, `MoEYS_GEIP_Standard_Data_${selectedPeriod}.xlsx`);
  };

  const nextStudent = () => {
    if (currentIndex < students.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const prevStudent = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (!currentStudent) return <div>កំពុងផ្ទុក...</div>;

  // Reusable Report Card Component for Print Rendering
  const StudentReportCard = ({ studentInfo }: { studentInfo: any }) => {
    const scores = demoMatrixData[studentInfo.id];
    return (
      <div className="max-w-[21cm] mx-auto bg-white p-8 sm:p-12 shadow-xl border border-slate-200 rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:break-after-page">
        {/* Header - Kingdom of Cambodia */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-khmer font-black text-slate-900 tracking-wider">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 className="text-lg font-khmer font-bold text-slate-800 tracking-wide mt-1">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
          <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-2"></div>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង</p>
            <p className="text-sm font-bold text-slate-800">សាលា៖ <span className="font-black text-[#155EEF]">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</span></p>
            <p className="text-sm font-bold text-slate-800">ឆ្នាំសិក្សា៖ <span className="font-black">២០២៥-២០២៦</span></p>
          </div>
          <div className="text-right space-y-1">
            <h1 className="text-2xl font-black text-[#155EEF] uppercase tracking-wide">សៀវភៅតាមដានការសិក្សា</h1>
            <p className="text-base font-bold text-slate-800">
              ប្រចាំខែ៖ <span className="font-black uppercase">{selectedPeriod === 'sem-1' ? 'ឆមាសទី១' : selectedPeriod === 'oct-2025' ? 'តុលា' : 'វិច្ឆិកា'}</span>
            </p>
          </div>
        </div>

        {/* Student Profile Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-x-12 gap-y-3 print:border-slate-300 print:bg-white">
          <div className="flex gap-2 text-sm">
            <span className="font-bold text-slate-500">អត្តលេខសិស្ស៖</span>
            <span className="font-mono font-black text-slate-900">{studentInfo.student_id_number}</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="font-bold text-slate-500">គោត្តនាម និងនាម៖</span>
            <span className="font-black text-[#155EEF] text-base leading-none">{studentInfo.full_name}</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="font-bold text-slate-500">ភេទ៖</span>
            <span className="font-black text-slate-900">{studentInfo.gender === 'F' ? 'ស្រី' : 'ប្រុស'}</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="font-bold text-slate-500">ថ្នាក់ទី៖</span>
            <span className="font-black text-slate-900">{activeClass?.name || '10A'}</span>
          </div>
        </div>

        {/* Grades Table */}
        <table className="w-full text-left border-collapse border border-slate-300 mb-6 print:border-slate-900">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-200 text-slate-800 font-black text-xs uppercase text-center border-b border-slate-300 print:border-slate-900">
              <th className="py-3 border-r border-slate-300 print:border-slate-900 w-12">ល.រ</th>
              <th className="py-3 border-r border-slate-300 print:border-slate-900">មុខវិជ្ជា</th>
              <th className="py-3 border-r border-slate-300 print:border-slate-900 w-24">ពិន្ទុអតិបរមា</th>
              <th className="py-3 border-r border-slate-300 print:border-slate-900 w-24">ពិន្ទុទទួលបាន</th>
              <th className="py-3 w-28">មតិគ្រូប្រចាំមុខវិជ្ជា</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {activeSchema.subjects.map((sub, idx) => {
              const score = scores[sub.id] || 0;
              const p = (score / sub.maxScore) * 100;
              let remark = 'មធ្យម';
              if(p>=80) remark = 'ល្អ';
              if(p>=90) remark = 'ល្អណាស់';
              if(p<50) remark = 'ខ្សោយ';

              return (
                <tr key={sub.id} className="border-b border-slate-200 print:border-slate-900 text-center">
                  <td className="py-2.5 border-r border-slate-200 print:border-slate-900 font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-4 border-r border-slate-200 print:border-slate-900 font-black text-left text-slate-800">{sub.label}</td>
                  <td className="py-2.5 border-r border-slate-200 print:border-slate-900 font-bold">{sub.maxScore}</td>
                  <td className="py-2.5 border-r border-slate-200 print:border-slate-900 font-black text-[#155EEF] print:text-black">{score}</td>
                  <td className="py-2.5 font-bold text-slate-600 text-xs">{remark}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 print:bg-white text-sm">
            <tr className="border-b border-slate-300 print:border-slate-900 font-black text-center">
              <td colSpan={2} className="py-3 border-r border-slate-300 print:border-slate-900 text-right pr-4 uppercase">ពិន្ទុសរុប (Total)</td>
              <td className="py-3 border-r border-slate-300 print:border-slate-900">{maxTotalScore}</td>
              <td className="py-3 border-r border-slate-300 print:border-slate-900 text-[#155EEF] text-lg print:text-black">{studentInfo.totalScore}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {/* Footer Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-slate-300 print:border-slate-900 p-3 rounded-lg text-center">
            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">មធ្យមភាគ (Average)</span>
            <span className="block text-xl font-black text-slate-900">{studentInfo.percentage.toFixed(2)}%</span>
          </div>
          <div className="border border-slate-300 print:border-slate-900 p-3 rounded-lg text-center">
            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">ចំណាត់ថ្នាក់ (Rank)</span>
            <span className="block text-xl font-black text-[#155EEF] print:text-black">{studentInfo.rank}</span>
          </div>
          <div className="border border-slate-300 print:border-slate-900 p-3 rounded-lg text-center">
            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">និទ្ទេស (Grade)</span>
            <span className="block text-xl font-black text-slate-900">{studentInfo.grade}</span>
          </div>
          <div className="border border-slate-300 print:border-slate-900 p-3 rounded-lg text-center">
            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">អវត្តមាន (Absences)</span>
            <span className="block text-xl font-black text-slate-900">0 ម៉ោង</span>
          </div>
        </div>

        {/* Signatures Area */}
        <div className="flex justify-between items-start pt-6 print:pt-12">
          <div className="text-center w-1/3">
            <span className="block text-sm font-bold text-slate-800 mb-16">បានឃើញ និងយល់ព្រម<br/>មាតាបិតា ឬអាណាព្យាបាល</span>
            <div className="w-32 h-[1px] border-b border-dashed border-slate-400 mx-auto mb-2"></div>
            <span className="text-xs font-bold text-slate-500">ហត្ថលេខា / ឈ្មោះ</span>
          </div>
          
          <div className="text-center w-1/3">
            <span className="block text-sm font-bold text-slate-800 mb-16">បានឃើញ និងឯកភាព<br/>នាយកសាលា</span>
            <div className="w-32 h-[1px] border-b border-dashed border-slate-400 mx-auto mb-2"></div>
            <span className="text-xs font-bold text-slate-500">ហត្ថលេខា / ឈ្មោះ</span>
          </div>

          <div className="text-center w-1/3">
            <span className="block text-sm font-bold text-slate-800 mb-1">ពោធិ៍រៀង, ថ្ងៃទី.......ខែ.......ឆ្នាំ២០២៥</span>
            <span className="block text-sm font-bold text-slate-800 mb-10">គ្រូបន្ទុកថ្នាក់</span>
            <div className="w-32 h-[1px] border-b border-dashed border-slate-400 mx-auto mb-2"></div>
            <span className="text-xs font-bold text-slate-500">ហត្ថលេខា / ឈ្មោះ</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 print:pb-0 print:space-y-0 print:p-0">
      
      {/* ----------------- Screen UI Only (Hidden on Print) ----------------- */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
              <Award className="w-8 h-8 text-[#155EEF]" />
              <span>ព្រឹត្តិបត្រពិន្ទុ</span>
            </h1>
            <p className="text-xs font-bold text-[#64748B] mt-1 flex items-center gap-1.5">
              <span>ថ្នាក់រៀន៖</span>
              <span className="font-extrabold text-[#155EEF] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                {activeClass?.name || '10A'}
              </span>
              <span>• បោះពុម្ពសៀវភៅតាមដានការសិក្សាសម្រាប់ផ្ញើជូនមាតាបិតា</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/grades" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">
              ត្រលប់ទៅសន្លឹកពិន្ទុ
            </Link>
            
            <button 
              onClick={handleExportGEIP}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>ទាញយកទិន្នន័យ GEIP</span>
            </button>

            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>បោះពុម្ពសៀវភៅទាំងអស់</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-[#64748B]">រើសខែ/ឆមាស៖</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="oct-2025">ប្រចាំខែតុលា 2025</option>
              <option value="nov-2025">ប្រចាំខែវិច្ឆិកា 2025</option>
              <option value="sem-1">ប្រឡងឆមាសលើកទី១</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={prevStudent}
              disabled={currentIndex === 0}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 w-48 text-center truncate">
              {currentIndex + 1} / {students.length}: {currentStudent.full_name}
            </div>
            <button 
              onClick={nextStudent}
              disabled={currentIndex === students.length - 1}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- Screen Single View (Hidden on Print) ----------------- */}
      <div className="print:hidden">
        <StudentReportCard studentInfo={currentStudent} />
      </div>

      {/* ----------------- Batch Print View (Hidden on Screen, Block on Print) ----------------- */}
      <div className="hidden print:block">
        {rankedStudents.map((std) => (
          <StudentReportCard key={std.id} studentInfo={std} />
        ))}
      </div>

    </div>
  );
}
