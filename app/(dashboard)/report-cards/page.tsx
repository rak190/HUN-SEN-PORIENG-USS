'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Student } from '@/types';
import { CURRICULUM_SCHEMAS } from '@/lib/curriculum';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { computeSummaryGrades } from '@/lib/grade-calculations';
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
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('dec');
  const [dbScores, setDbScores] = useState<Record<string, Record<string, number>>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const supabase = createClient();
  
  useEffect(() => {
    if (!activeClass?.id) return;
    
    const fetchData = async () => {
      setIsLoadingData(true);
      // Fetch students for this class
      const { data: stdData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', activeClass.id)
        .eq('is_active', true);
        
      if (stdData && stdData.length > 0) {
        setStudents(stdData);
      }
      
      // Define which periods we need to fetch based on selected period
      let targetPeriods = [selectedPeriod];
      if (selectedPeriod === 'sem1-summary') {
        targetPeriods = ['dec', 'jan', 'feb', 'sem1-exam', 'sem1-summary'];
      } else if (selectedPeriod === 'sem2-summary') {
        targetPeriods = ['may', 'jun', 'jul', 'sem2-exam', 'sem2-summary'];
      } else if (selectedPeriod === 'annual') {
        targetPeriods = ['dec', 'jan', 'feb', 'sem1-exam', 'sem1-summary', 'may', 'jun', 'jul', 'sem2-exam', 'sem2-summary', 'annual'];
      }

      const { data: gradeData } = await supabase
        .from('grades')
        .select('student_id, period, scores')
        .eq('class_id', activeClass.id)
        .in('period', targetPeriods);
        
      if (gradeData && stdData) {
        // Collect all subject IDs from the schema
        const schema = CURRICULUM_SCHEMAS['upper-sec-sci']; // Or dynamically get it based on activeClass
        const subjectIds: string[] = [];
        schema.subjects.forEach(sub => {
          subjectIds.push(sub.id);
          if (sub.subMetrics) {
            sub.subMetrics.forEach(m => subjectIds.push(`${sub.id}_${m.id}`));
          }
        });

        const scoreMap: Record<string, Record<string, number>> = {};
        stdData.forEach(std => {
          scoreMap[std.id] = computeSummaryGrades(gradeData, std.id, selectedPeriod, subjectIds);
        });
        setDbScores(scoreMap);
      }
      setIsLoadingData(false);
    };
    
    fetchData();
  }, [activeClass?.id, selectedPeriod]);
  
  const activeSchema = CURRICULUM_SCHEMAS['upper-sec-sci'];
  const maxTotalScore = activeSchema.subjects.reduce((sum, sub) => sum + sub.maxScore, 0);

  // Generate consistent demo scores for ALL students for batch printing and export
  const matrixData = useMemo(() => {
    if (Object.keys(dbScores).length > 0) {
      return dbScores;
    }
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
  }, [students, activeSchema, dbScores]);

  // Calculate ranks
  const rankedStudents = useMemo(() => {
    const sorted = [...students].map(std => {
      const scores = matrixData[std.id] || {};
      const totalScore = activeSchema.subjects.reduce((sum, sub) => sum + (scores[sub.id] || 0), 0);
      const totalCoefficient = maxTotalScore / 50;
      const average = totalScore / totalCoefficient;
      let grade = 'F';
      if (average >= 42.5) grade = 'A';
      else if (average >= 40.0) grade = 'B';
      else if (average >= 35.0) grade = 'C';
      else if (average >= 30.0) grade = 'D';
      else if (average >= 25.0) grade = 'E';

      return { ...std, totalScore, percentage: average, grade };
    }).sort((a, b) => b.totalScore - a.totalScore);
    
    // Assign 1, 1, 3 ranks
    let currentRank = 1;
    return sorted.map((std, idx) => {
      if (idx > 0 && std.totalScore < sorted[idx - 1].totalScore) {
        currentRank = idx + 1;
      }
      return { ...std, rank: currentRank };
    });
  }, [students, matrixData, activeSchema, maxTotalScore]);

  // Calculate subject ranks (1, 1, 3 ranking)
  const subjectRanks = useMemo(() => {
    const ranksMap: Record<string, Record<string, number>> = {};
    
    // Initialize ranksMap
    students.forEach(std => {
      ranksMap[std.id] = {};
    });

    activeSchema.subjects.forEach(sub => {
      // Create array of { id, score }
      const subScores = students.map(std => ({
        id: std.id,
        score: matrixData[std.id]?.[sub.id] || 0
      }));

      // Sort descending
      subScores.sort((a, b) => b.score - a.score);

      // Assign ranks (1, 1, 3 style)
      let currentRank = 1;
      for (let i = 0; i < subScores.length; i++) {
        if (i > 0 && subScores[i].score < subScores[i - 1].score) {
          currentRank = i + 1;
        }
        ranksMap[subScores[i].id][sub.id] = currentRank;
      }
    });

    return ranksMap;
  }, [students, matrixData, activeSchema]);

  const currentStudent = rankedStudents.find(s => s.id === students[currentIndex].id);

  const handlePrint = () => {
    window.print();
  };

  const handleExportGEIP = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('GEIP Data', {
      views: [
        { state: 'frozen', xSplit: 2, ySplit: 1 } // Freeze top row and first 2 cols (ID, Name)
      ]
    });

    // Define Columns
    const columns = [
      { header: 'អត្តលេខ', key: 'student_id_number', width: 12 },
      { header: 'នាមត្រកូល និងនាមខ្លួន', key: 'full_name', width: 25 },
      { header: 'ភេទ', key: 'gender', width: 8 },
      { header: 'ថ្នាក់ទី', key: 'class_name', width: 10 },
      { header: 'សរសេរតាមអាន', key: 'khmer_dictation', width: 15 },
      { header: 'តែងសេចក្តី', key: 'khmer_composition', width: 15 },
      { header: 'ល្បឿនអំណាន', key: 'khmer_reading_speed', width: 15 },
    ];

    activeSchema.subjects.forEach(sub => {
      columns.push({ header: sub.label, key: sub.id, width: 15 });
    });

    columns.push(
      { header: 'ពិន្ទុសរុប', key: 'totalScore', width: 12 },
      { header: 'និទ្ទេសប្រចាំខែ', key: 'grade', width: 15 },
      { header: 'ចំណាត់ថ្នាក់', key: 'rank', width: 12 }
    );

    sheet.columns = columns;

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF000000' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Add Data
    rankedStudents.forEach((std) => {
      const scores = matrixData[std.id] || {};
      const rowData: any = {
        student_id_number: std.student_id_number,
        full_name: std.full_name,
        gender: std.gender === 'F' ? 'ស្រី' : 'ប្រុស',
        class_name: activeClass?.name || '10A',
        khmer_dictation: scores['khmer_dictation'] || 0,
        khmer_composition: scores['khmer_composition'] || 0,
        khmer_reading_speed: scores['khmer_reading_speed'] || 0,
        totalScore: std.totalScore,
        grade: std.grade,
        rank: std.rank,
      };

      activeSchema.subjects.forEach(sub => {
        rowData[sub.id] = scores[sub.id] || 0;
      });

      sheet.addRow(rowData);
    });

    // Add Borders and alignments to all cells
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        // Center text except for full_name (column 2)
        if (colNumber !== 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `MoEYS_GEIP_Standard_Data_${selectedPeriod}.xlsx`);
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
    const scores = matrixData[studentInfo.id] || {};
    return (
      <div className="max-w-[21cm] mx-auto bg-white p-8 sm:p-12 shadow-xl border border-slate-200 rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:break-after-page report-card-print">
        {/* Header - Kingdom of Cambodia */}
        <div className="text-center mb-6 print:mb-3">
          <h2 className="text-xl font-khmer font-black text-slate-900 tracking-wider">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 className="text-lg font-khmer font-bold text-slate-800 tracking-wide mt-1">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
          <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-2 print:mt-1"></div>
        </div>

        <div className="flex justify-between items-start mb-6 print:mb-3">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង</p>
            <p className="text-sm font-bold text-slate-800">សាលា៖ <span className="font-black text-[#155EEF]">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</span></p>
            <p className="text-sm font-bold text-slate-800">ឆ្នាំសិក្សា៖ <span className="font-black">២០២៥-២០២៦</span></p>
          </div>
          <div className="text-right space-y-1">
            <h1 className="text-2xl font-black text-[#155EEF] uppercase tracking-wide">ព្រឹត្តិបត្រពិន្ទុ</h1>
            <p className="text-base font-bold text-slate-800">
              ប្រចាំខែ/ឆមាស៖ <span className="font-black uppercase">{ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label.split('(')[0].trim() || ''}</span>
            </p>
          </div>
        </div>

        {/* Student Profile Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 print:mb-3 flex flex-wrap gap-x-12 gap-y-3 print:border-slate-300 print:bg-white print:py-2">
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
          <div className="flex gap-2 text-sm">
            <span className="font-bold text-slate-500">សិស្សសរុប៖</span>
            <span className="font-black text-slate-900">{students.length} នាក់ (ស្រី {students.filter(s => s.gender === 'F').length} នាក់)</span>
          </div>
        </div>
        
        <p className="text-[13px] font-bold text-[#155EEF] mb-3 print:mb-2 print:text-slate-800">👉 សូមគោរពជូន មាតាបិតា ឬអ្នកអាណាព្យាបាលសិស្ស ជ្រាបជាព័ត៌មាន</p>

        <h3 className="font-black text-slate-800 text-sm mb-2 uppercase">ក. លទ្ធផលសិក្សា</h3>
        {/* Grades Table */}
        <table className="w-full text-left border-collapse border border-slate-300 mb-4 print:mb-3 print:border-slate-900 report-card-table">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-200 text-slate-800 font-black text-[10px] uppercase text-center border-b border-slate-300 print:border-slate-900">
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-8">ល.រ</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900">មុខវិជ្ជា</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-16">ពិន្ទុអតិបរមា</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-16">ពិន្ទុទទួលបាន</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-16">ចំណាត់ថ្នាក់</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-16">និទ្ទេស</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-20">មូលវិចារ</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-16">លទ្ធផល</th>
              <th className="py-2 border-r border-slate-300 print:border-slate-900 w-16">ផ្សេងៗ</th>
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

              let letterGrade = 'F';
              if(p>=90) letterGrade = 'A';
              else if(p>=80) letterGrade = 'B';
              else if(p>=70) letterGrade = 'C';
              else if(p>=60) letterGrade = 'D';
              else if(p>=50) letterGrade = 'E';

              const result = p >= 50 ? 'ជាប់' : 'ធ្លាក់';
              const resultColor = p >= 50 ? 'text-emerald-600 print:text-black' : 'text-rose-600 print:text-black';

              return (
                <tr key={sub.id} className="border-b border-slate-200 print:border-slate-900 text-center">
                  <td className="py-1.5 border-r border-slate-200 print:border-slate-900 font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 print:border-slate-900 font-black text-left text-slate-800 whitespace-nowrap">{sub.label}</td>
                  <td className="py-1.5 border-r border-slate-200 print:border-slate-900 font-bold">{sub.maxScore}</td>
                  <td className="py-1.5 border-r border-slate-200 print:border-slate-900 font-black text-[#155EEF] print:text-black">{score}</td>
                  <td className="py-1.5 border-r border-slate-200 print:border-slate-900 font-black text-slate-800">{subjectRanks[studentInfo.id]?.[sub.id] || ''}</td>
                  <td className="py-1.5 border-r border-slate-200 print:border-slate-900 font-black text-slate-800">{letterGrade}</td>
                  <td className="py-1.5 font-bold text-slate-600 text-[10px] border-r border-slate-200 print:border-slate-900">{remark}</td>
                  <td className={`py-1.5 font-black text-xs border-r border-slate-200 print:border-slate-900 ${resultColor}`}>{result}</td>
                  <td className="py-1.5 border-r border-slate-200 print:border-slate-900"></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 print:bg-white text-sm">
            <tr className="border-b border-slate-300 print:border-slate-900 font-black text-center">
              <td colSpan={2} className="py-3 border-r border-slate-300 print:border-slate-900 text-right pr-4 uppercase">ពិន្ទុសរុប (Total)</td>
              <td className="py-3 border-r border-slate-300 print:border-slate-900">{maxTotalScore}</td>
              <td className="py-2 border-r border-slate-300 print:border-slate-900 text-[#155EEF] text-base print:text-black">{studentInfo.totalScore}</td>
              <td colSpan={5} className="border-r border-slate-300 print:border-slate-900"></td>
            </tr>
          </tfoot>
        </table>

        {/* Footer Summary Grid */}
        <div className="grid grid-cols-3 gap-4 mb-3 print:mb-2">
          <div className="border border-slate-300 print:border-slate-900 p-2 rounded-lg text-center">
            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">មធ្យមភាគ (Average)</span>
            <span className="block text-lg font-black text-slate-900">{studentInfo.percentage.toFixed(2)}</span>
          </div>
          <div className="border border-slate-300 print:border-slate-900 p-2 rounded-lg text-center">
            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">ចំណាត់ថ្នាក់ (Rank)</span>
            <span className="block text-lg font-black text-[#155EEF] print:text-black">{studentInfo.rank}</span>
          </div>
          <div className="border border-slate-300 print:border-slate-900 p-2 rounded-lg text-center">
            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">និទ្ទេស (Grade)</span>
            <span className="block text-lg font-black text-slate-900">{studentInfo.grade}</span>
          </div>
        </div>

        <h3 className="font-black text-slate-800 text-sm mb-2 mt-3 print:mt-2 uppercase">ខ. ចំនួនដងអវត្តមានក្នុងខែ</h3>
        <div className="flex gap-16 text-sm font-bold text-slate-800 mb-4 print:mb-2 ml-4">
          <div className="flex items-end gap-2">
            <span className="pb-1">អវត្តមានមានច្បាប់៖</span>
            <span className="border-b border-dotted border-slate-400 w-16 text-center font-black text-slate-900 pb-0.5">0</span>
            <span className="pb-1">ដង</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="pb-1">អវត្តមានឥតច្បាប់៖</span>
            <span className="border-b border-dotted border-slate-400 w-16 text-center font-black text-rose-600 print:text-black pb-0.5">0</span>
            <span className="pb-1">ដង</span>
          </div>
        </div>

        {/* Signatures Area */}
        <div className="flex justify-between items-start pt-4 print:pt-2 report-card-signatures">
          <div className="text-center w-1/2 relative flex flex-col justify-between h-28 print:h-24">
            <span className="block text-sm font-bold text-slate-800">បានឃើញ និងឯកភាព<br/><span className="inline-block -ml-6">នាយកសាលា</span></span>
            
            {/* Authentic Stamp Overlay */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-85 z-10 w-28 h-28 print:w-24 print:h-24 pointer-events-none mix-blend-multiply filter contrast-125">
              <img src="/images/principal-stamp.png" alt="Principal Stamp" className="w-full h-full object-contain" />
            </div>

            <div className="mt-auto">
              <div className="w-40 h-[1px] border-b border-dashed border-slate-400 mx-auto mb-2 relative z-0"></div>
              <span className="text-xs font-bold text-slate-500 relative z-0">ហត្ថលេខា / ឈ្មោះ / ត្រា</span>
            </div>
          </div>

          <div className="text-center w-1/2 flex flex-col justify-between h-28 print:h-24">
            <div>
              <span className="block text-[11px] font-bold text-slate-800 mb-1 leading-relaxed">
                ថ្ងៃ....................ទី.............ខែ........................ឆ្នាំ...................ព.ស.២៥៦......<br/>
                ធ្វើនៅពោធិ៍រៀង, ថ្ងៃទី...........ខែ...................ឆ្នាំ២០២.....
              </span>
              <span className="block text-sm font-bold text-slate-800 mt-2">គ្រូបន្ទុកថ្នាក់</span>
            </div>
            
            <div className="mt-auto">
              <div className="w-40 h-[1px] border-b border-dashed border-slate-400 mx-auto mb-2"></div>
              <span className="text-xs font-bold text-slate-500">ហត្ថលេខា / ឈ្មោះ</span>
            </div>
          </div>
        </div>

        {/* Parent Feedback Area */}
        <div className="mt-4 print:mt-2 pt-4 print:pt-2 border-t border-dashed border-slate-300 print:border-slate-400">
          <div className="flex items-end gap-2 mb-5 print:mb-3">
            <span className="text-base leading-none">👉</span>
            <span className="text-[13px] font-bold text-slate-800 whitespace-nowrap">សូមផ្តល់មតិត្រឡប់ៈ</span>
            <div className="flex-1 border-b-[2px] border-dotted border-slate-300 print:border-slate-400"></div>
          </div>
          <div className="flex gap-2 mb-5 print:mb-3 pl-6">
            <div className="flex-1 border-b-[2px] border-dotted border-slate-300 print:border-slate-400"></div>
          </div>
          <div className="flex gap-2 pl-6">
            <div className="flex-1 border-b-[2px] border-dotted border-slate-300 print:border-slate-400"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 print:pb-0 print:space-y-0 print:p-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm !important;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-card-print {
            width: 100% !important;
            height: 260mm !important;
            max-height: 260mm !important;
            min-height: 260mm !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .report-card-print .mb-8 {
            margin-bottom: 12px !important;
          }
          .report-card-print .mb-6 {
            margin-bottom: 10px !important;
          }
          .report-card-print .mb-16 {
            margin-bottom: 30px !important;
          }
          .report-card-print .mb-10 {
            margin-bottom: 20px !important;
          }
          .report-card-print .pt-6 {
            padding-top: 8px !important;
          }
          .report-card-table th, 
          .report-card-table td {
            padding-top: 5px !important;
            padding-bottom: 5px !important;
            font-size: 11px !important;
          }
          .report-card-signatures {
            padding-top: 8px !important;
          }
        }
      `}</style>
      
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
              <span>• បោះពុម្ពព្រឹត្តិបត្រពិន្ទុសម្រាប់ផ្ញើជូនមាតាបិតា</span>
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
              className="px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>ទាញយកជា PDF / បោះពុម្ព</span>
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
              {ACADEMIC_PERIODS.map(period => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
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
