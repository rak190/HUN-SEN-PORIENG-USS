'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Student } from '@/types';
import { CURRICULUM_SCHEMAS, SubjectSchema } from '@/lib/curriculum';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { computeSummaryGrades } from '@/lib/grade-calculations';
import {
  ClipboardList,
  Search,
  Award
} from 'lucide-react';
import Link from 'next/link';

const DEMO_STUDENTS_GR: Student[] = [
  { id: 'std-1', class_id: 'demo-class-1', student_id_number: 'ID-001', full_name: 'កែវ ច័ន្ទធីតា', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-2', class_id: 'demo-class-1', student_id_number: 'ID-002', full_name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-3', class_id: 'demo-class-1', student_id_number: 'ID-003', full_name: 'ចាន់ សុភាព', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-4', class_id: 'demo-class-1', student_id_number: 'ID-004', full_name: 'ដួង រដ្ឋា', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-5', class_id: 'demo-class-1', student_id_number: 'ID-005', full_name: 'ទិត្យ វិសាល', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-6', class_id: 'demo-class-1', student_id_number: 'ID-006', full_name: 'ប៊ុន រស្មី', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-7', class_id: 'demo-class-1', student_id_number: 'ID-007', full_name: 'មាស សុខា', gender: 'M', is_active: true, created_at: new Date().toISOString() },
];

export default function GradesPage() {
  const { activeClass, isDemoMode } = useAuth();
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS_GR);
  
  const curriculumType = useMemo(() => {
    if (!activeClass?.name) return 'upper-sec-sci';
    const gradeMatch = activeClass.name.match(/\d+/);
    if (gradeMatch) {
      const grade = parseInt(gradeMatch[0], 10);
      if (grade >= 7 && grade <= 9) return 'lower-sec';
      if (grade >= 10 && grade <= 12) {
        if (activeClass.name.toLowerCase().includes('ss') || activeClass.name.toLowerCase().includes('art')) {
          return 'upper-sec-art';
        }
        return 'upper-sec-sci';
      }
    }
    return 'upper-sec-sci';
  }, [activeClass]);
  
  const activeSchema = CURRICULUM_SCHEMAS[curriculumType];
  const maxTotalScore = activeSchema.subjects.reduce((sum, sub) => sum + sub.maxScore, 0);

  const [selectedPeriod, setSelectedPeriod] = useState('dec');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Matrix data: Record<studentId, Record<columnId, number>>
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, number>>>({});
  const [rawGradesData, setRawGradesData] = useState<any[]>([]);
  
  const isSummaryPeriod = selectedPeriod.includes('summary');
  
  const supabase = createClient();

  // Flatten columns to easily render headers and map keyboard inputs
  const flatColumns = useMemo(() => {
    const cols: { id: string; label: string; maxScore: number; isMain: boolean }[] = [];
    activeSchema.subjects.forEach(sub => {
      if (sub.subMetrics) {
        sub.subMetrics.forEach(metric => {
          cols.push({ 
            id: `${sub.id}_${metric.id}`, 
            label: metric.label, 
            maxScore: metric.maxScore || 100, 
            isMain: false 
          });
        });
      }
      cols.push({ id: sub.id, label: sub.label, maxScore: sub.maxScore, isMain: true });
    });
    return cols;
  }, [activeSchema]);

  useEffect(() => {
    if (isDemoMode || !activeClass) {
      setStudents(DEMO_STUDENTS_GR);
      // Demo Data
      const mData: Record<string, Record<string, number>> = {};
      DEMO_STUDENTS_GR.forEach(s => {
        mData[s.id] = {};
        flatColumns.forEach(col => {
           mData[s.id][col.id] = Math.floor(Math.random() * (col.maxScore - (col.maxScore * 0.4))) + (col.maxScore * 0.4);
        });
      });
      setMatrixData(mData);
      return;
    }

    async function loadData() {
      const { data: stdData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', activeClass?.id || '')
        .order('full_name', { ascending: true });

      if (stdData && stdData.length > 0) {
        setStudents(stdData as Student[]);
        
        // Load grades
        let targetPeriods = [selectedPeriod];
        if (selectedPeriod === 'sem1-summary') {
          targetPeriods = ['dec', 'jan', 'feb', 'sem1-exam', 'sem1-summary'];
        } else if (selectedPeriod === 'sem2-summary') {
          targetPeriods = ['may', 'jun', 'jul', 'sem2-exam', 'sem2-summary'];
        } else if (selectedPeriod === 'annual') {
          targetPeriods = ['dec', 'jan', 'feb', 'sem1-exam', 'sem1-summary', 'may', 'jun', 'jul', 'sem2-exam', 'sem2-summary', 'annual'];
        }

        const { data: gradesData } = await supabase
          .from('grades')
          .select('student_id, period, scores')
          .eq('class_id', activeClass?.id || '')
          .in('period', targetPeriods);

        const newMap: Record<string, Record<string, number>> = {};
        if (gradesData) {
          setRawGradesData(gradesData);
          const subjectIds = flatColumns.map(c => c.id);
          stdData.forEach(s => {
            newMap[s.id] = computeSummaryGrades(gradesData, s.id, selectedPeriod, subjectIds);
          });
        }
        setMatrixData(newMap);
      }
    }

    loadData();
  }, [activeClass, curriculumType, selectedPeriod, isDemoMode, flatColumns]);

  function handleScoreChange(studentId: string, colId: string, value: string, maxScore: number) {
    // Read-only, no longer allow manual changes here.
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;
    switch (e.key) {
      case 'ArrowUp': nextRow -= 1; break;
      case 'ArrowDown':
      case 'Enter': nextRow += 1; break;
      case 'ArrowLeft': nextCol -= 1; break;
      case 'ArrowRight': nextCol += 1; break;
      default: return;
    }
    e.preventDefault();
    const nextInputId = `grade-${nextRow}-${nextCol}`;
    const nextInput = document.getElementById(nextInputId) as HTMLInputElement | null;
    if (nextInput) {
      nextInput.focus();
    }
  };

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_id_number && s.student_id_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate totals and ranks (Only using main subjects, skipping sub-metrics)
  const rankedStudents = useMemo(() => {
    const isSem1 = selectedPeriod === 'sem1-summary';
    const isSem2 = selectedPeriod === 'sem2-summary';
    const totalCoefficient = maxTotalScore / 50;

    return [...filteredStudents].map((std) => {
      const studentScores = matrixData[std.id] || {};
      const totalScore = activeSchema.subjects.reduce((sum, sub) => sum + (studentScores[sub.id] || 0), 0);
      
      let breakdown = {};
      
      if (isSem1 || isSem2) {
        let m1Total = 0, m2Total = 0, m3Total = 0, examTotal = 0;
        if (isSem1) {
          const dec = rawGradesData.find(g => g.student_id === std.id && g.period === 'dec')?.scores || {};
          const jan = rawGradesData.find(g => g.student_id === std.id && g.period === 'jan')?.scores || {};
          const feb = rawGradesData.find(g => g.student_id === std.id && g.period === 'feb')?.scores || {};
          const exam = rawGradesData.find(g => g.student_id === std.id && g.period === 'sem1-exam')?.scores || {};
          activeSchema.subjects.forEach(sub => {
            m1Total += dec[sub.id] || 0;
            m2Total += jan[sub.id] || 0;
            m3Total += feb[sub.id] || 0;
            examTotal += exam[sub.id] || 0;
          });
        } else if (isSem2) {
          const may = rawGradesData.find(g => g.student_id === std.id && g.period === 'may')?.scores || {};
          const jun = rawGradesData.find(g => g.student_id === std.id && g.period === 'jun')?.scores || {};
          const jul = rawGradesData.find(g => g.student_id === std.id && g.period === 'jul')?.scores || {};
          const exam = rawGradesData.find(g => g.student_id === std.id && g.period === 'sem2-exam')?.scores || {};
          activeSchema.subjects.forEach(sub => {
            m1Total += may[sub.id] || 0;
            m2Total += jun[sub.id] || 0;
            m3Total += jul[sub.id] || 0;
            examTotal += exam[sub.id] || 0;
          });
        }
        
        const monthlyTotal = (m1Total + m2Total + m3Total) / 3;
        
        breakdown = {
          examScore: examTotal,
          examAvg: examTotal / totalCoefficient,
          monthlyAvg: monthlyTotal / totalCoefficient,
          semesterAvg: totalScore / totalCoefficient
        };
      }

      const average = totalScore / totalCoefficient;
      let grade = 'F';
      if (average >= 42.5) grade = 'A';
      else if (average >= 40.0) grade = 'B';
      else if (average >= 35.0) grade = 'C';
      else if (average >= 30.0) grade = 'D';
      else if (average >= 25.0) grade = 'E';

      return { ...std, totalScore, grade, percentage: average, breakdown };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }, [filteredStudents, matrixData, rawGradesData, activeSchema, maxTotalScore, selectedPeriod]);

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <ClipboardList className="w-8 h-8 text-[#155EEF]" />
            <span>សន្លឹកពិន្ទុរួម</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1 flex items-center gap-1.5">
            <span>ថ្នាក់រៀន៖</span>
            <span className="font-extrabold text-[#155EEF] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              {activeClass?.name || '10A'}
            </span>
            <span>• រួមបញ្ចូលទាំងមុខវិជ្ជាស្នូល និងសមាសភាគតេស្តស្តង់ដា GEIP</span>
          </p>
        </div>

        <div className="flex items-center gap-3">

          <Link
            href="/report-cards"
            className="px-4 py-2.5 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all scale-[1.01]"
          >
            <Award className="w-4 h-4" />
            <span>បោះពុម្ពព្រឹត្តិបត្រពិន្ទុ</span>
          </Link>
        </div>
      </div>

      {/* Controls Strip */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#64748B]">កម្មវិធីសិក្សា៖</span>
            <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-[#155EEF]">
              {activeSchema?.label}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#64748B]">ខែ/ឆមាស៖</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#155EEF]"
            >
              {ACADEMIC_PERIODS.map(period => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ពិន្ទុអតិបរមាសរុប</span>
            <span className="text-lg font-black text-[#155EEF]">{maxTotalScore}</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះសិស្ស..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#155EEF]"
            />
          </div>
        </div>
      </div>

      {/* Massive Matrix Table */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                <th className="py-4 px-3 w-10 text-center sticky left-0 bg-slate-100 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">ល.រ</th>
                <th className="py-4 px-3 text-center sticky left-[40px] bg-slate-100 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">អត្តលេខ</th>
                <th className="py-4 px-4 sticky left-[100px] bg-slate-100 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[160px]">គោត្តនាម & នាម</th>
                
                {!isSummaryPeriod ? (
                  <>
                    <th className="py-4 px-3 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200 min-w-[90px]">ពិន្ទុសរុប<br/>({maxTotalScore})</th>
                    <th className="py-4 px-3 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200 min-w-[90px]">មធ្យមភាគ<br/>(50)</th>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">ចំណាត់<br/>ថ្នាក់</th>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">និទ្ទេស</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">ពិន្ទុប្រលង<br/>ឆមាស</th>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">ម.ប្រលង<br/>ឆមាស</th>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">ម.ខែ<br/>ឆមាស</th>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">ម.ប្រចាំ<br/>ឆមាស</th>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">និទ្ទេស<br/>ប្រចាំឆ.</th>
                    <th className="py-4 px-2 text-center bg-blue-100/80 text-blue-900 border-r border-blue-200">ចំ.<br/>ថ្នាក់</th>
                  </>
                )}
                
                {flatColumns.map(col => (
                  <th key={col.id} className={`py-2 px-1 text-center border-r border-slate-200 min-w-[70px] ${!col.isMain ? 'bg-amber-50/80' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`truncate w-full block text-[9px] ${!col.isMain ? 'text-amber-700' : 'text-slate-700'}`}>
                        {col.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                        !col.isMain ? 'bg-white text-amber-600 border border-amber-200' : 'bg-white text-[#155EEF] border border-slate-200'
                      }`}>
                        {col.maxScore}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {rankedStudents.map((std, rowIndex) => (
                <tr key={std.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="py-3 px-3 text-center text-slate-400 font-bold sticky left-0 bg-white group-hover:bg-blue-50/50 z-10 border-r border-slate-100">
                    {rowIndex + 1}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500 sticky left-[40px] bg-white group-hover:bg-blue-50/50 z-10 border-r border-slate-100">
                    {std.student_id_number || '-'}
                  </td>
                  <td className="py-3 px-4 font-black text-slate-800 sticky left-[100px] bg-white group-hover:bg-blue-50/50 z-10 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      {std.full_name}
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        std.gender === 'F' || std.gender === 'ស្រី' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                      </span>
                    </div>
                  </td>
                  
                  {/* Results */}
                  {!isSummaryPeriod ? (
                    <>
                      <td className="py-3 px-3 text-center bg-blue-50/40 font-black text-base text-[#155EEF] border-r border-slate-100">
                        {std.totalScore}
                      </td>
                      <td className="py-3 px-3 text-center bg-blue-50/40 font-black text-sm text-slate-700 border-r border-slate-100">
                        {std.percentage?.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 border-r border-slate-100">
                        <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-black text-xs ${
                          rowIndex === 0 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                          rowIndex === 1 ? 'bg-slate-300 text-slate-800' :
                          rowIndex === 2 ? 'bg-amber-600 text-white' : 'text-slate-600'
                        }`}>
                          {rowIndex + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 border-r border-slate-100">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                          std.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                          std.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          std.grade === 'C' ? 'bg-sky-100 text-sky-800' :
                          std.grade === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {std.grade}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-2 text-center bg-blue-50/40 font-black text-sm text-[#155EEF] border-r border-slate-100">
                        {(std as any).breakdown?.examScore || 0}
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 font-bold text-sm text-slate-700 border-r border-slate-100">
                        {(std as any).breakdown?.examAvg?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 font-bold text-sm text-slate-700 border-r border-slate-100">
                        {(std as any).breakdown?.monthlyAvg?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 font-black text-sm text-emerald-700 border-r border-slate-100">
                        {(std as any).breakdown?.semesterAvg?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 border-r border-slate-100">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                          std.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                          std.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          std.grade === 'C' ? 'bg-sky-100 text-sky-800' :
                          std.grade === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {std.grade}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 border-r border-slate-100">
                        <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-black text-xs ${
                          rowIndex === 0 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                          rowIndex === 1 ? 'bg-slate-300 text-slate-800' :
                          rowIndex === 2 ? 'bg-amber-600 text-white' : 'text-slate-600'
                        }`}>
                          {rowIndex + 1}
                        </span>
                      </td>
                    </>
                  )}

                  {/* Matrix Inputs */}
                  {flatColumns.map((col, colIndex) => {
                    const val = matrixData[std.id]?.[col.id];
                    return (
                      <td key={col.id} className={`py-2 px-1 text-center border-r border-slate-50 ${!col.isMain ? 'bg-amber-50/20' : ''}`}>
                        <div className="flex justify-center">
                          <input
                            id={`grade-${rowIndex}-${colIndex}`}
                            type="number"
                            max={col.maxScore}
                            min={0}
                            value={val === undefined ? '' : val}
                            placeholder="-"
                            onChange={(e) => handleScoreChange(std.id, col.id, e.target.value, col.maxScore)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                            readOnly
                            className={`w-12 sm:w-14 p-1.5 text-center rounded-lg bg-transparent border border-transparent font-black text-slate-700 transition-all ${
                              !col.isMain ? 'text-amber-800' : ''
                            }`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
