'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Student } from '@/types';
import { CURRICULUM_SCHEMAS, SubjectSchema, getCurriculumSchemaForClass } from '@/lib/curriculum';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { computeSummaryGrades } from '@/lib/domain/grading';
import {
  ClipboardList,
  Search,
  Award,
  Download,
  Upload,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Link from 'next/link';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ClassGradeImportModal } from '@/components/grades/ClassGradeImportModal';
import { GeipExportModal } from '@/components/grades/GeipExportModal';

export default function GradesPage() {
  const { activeClass, isDemoMode } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const activeSchema = useMemo(() => {
    return getCurriculumSchemaForClass(activeClass?.grade, activeClass?.track);
  }, [activeClass?.grade, activeClass?.track]);
  
  const curriculumType = activeSchema.id;
  const maxTotalScore = activeSchema.subjects.reduce((sum, sub) => sum + sub.maxScore, 0);

  const [selectedPeriod, setSelectedPeriod] = useState('dec');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Matrix data: Record<studentId, Record<columnId, number>>
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, number>>>({});
  const [rawGradesData, setRawGradesData] = useState<any[]>([]);
  
  const isSummaryPeriod = selectedPeriod.includes('summary');
  const isAnnual = selectedPeriod === 'annual';
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGeipModalOpen, setIsGeipModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const supabase = createClient();

  const exportToExcel = async () => {
    if (!activeClass) return;
    setIsExporting(true);
    try {
      // 1. Fetch template
      const response = await fetch('/templates/moeys-grade-template.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      
      // 2. Load into exceljs
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      // 3. Find the right sheet (e.g., month or exam)
      const periodNameStr = selectedPeriod.includes('sem') ? 'ឆមាស' : 'ខែ';
      let targetSheet = workbook.worksheets.find(s => s.name.includes(periodNameStr)) || workbook.worksheets[0];
      
      // 4. Fill Data at Row 17
      let currentRow = 17;
      rankedStudents.forEach((std, index) => {
         const row = targetSheet.getRow(currentRow);
         row.getCell(1).value = index + 1; // ល.រ
         row.getCell(2).value = std.student_id_number || ''; // អត្តលេខ
         row.getCell(3).value = std.full_name; // នាមត្រកូល និងនាមខ្លួន
         row.getCell(4).value = std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'; // ភេទ
         
         const studentScores = matrixData[std.id] || {};
         // Read row 16 headers to map
         const headerRow = targetSheet.getRow(16);
         headerRow.eachCell((cell, colNumber) => {
            if (colNumber < 5) return; // Skip basic info
            const headerVal = cell.value?.toString().trim().replace(/\s+/g, '');
            if (!headerVal) return;
            
            const matchedCol = flatColumns.find(c => {
               const labelStripped = c.label.replace(/\s+/g, '');
               return headerVal.includes(labelStripped) || labelStripped.includes(headerVal);
            });
            
            if (matchedCol && studentScores[matchedCol.id] !== undefined) {
               row.getCell(colNumber).value = studentScores[matchedCol.id];
            }
         });
         
         row.commit();
         currentRow++;
      });
      
      // Clear out the rest of the rows in the template
      while(currentRow <= 80) {
         const row = targetSheet.getRow(currentRow);
         // Keep formatting but clear values for basic columns
         row.getCell(1).value = null;
         row.getCell(2).value = null;
         row.getCell(3).value = null;
         row.getCell(4).value = null;
         row.commit();
         currentRow++;
      }
      
      // 5. Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Grade_Template_${activeClass.name}_${selectedPeriod}.xlsx`);
      
    } catch (error) {
      console.error(error);
      alert('Error exporting Excel');
    } finally {
      setIsExporting(false);
    }
  };

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
    if (!activeClass) {
      setStudents([]);
      setMatrixData({});
      return;
    }

    async function loadData() {
      setIsLoading(true);
      const { data: stdData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', activeClass?.id || '')
        .order('desk_number', { ascending: true, nullsFirst: false })
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
          .in('period', targetPeriods)
          .eq('status', 'published'); // Filter to only show scores published by the Admin

        const newMap: Record<string, Record<string, number>> = {};
        if (gradesData) {
          setRawGradesData(gradesData);
          const subjectIds = flatColumns.map(c => c.id);
          stdData.forEach(s => {
            newMap[s.id] = computeSummaryGrades(gradesData, s.id, selectedPeriod, subjectIds);
          });
        }
        setMatrixData(newMap);
      } else {
        setStudents([]);
        setMatrixData({});
      }
      setIsLoading(false);
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

  const [sortState, setSortState] = useState<{ field: string | null; direction: 'asc' | 'desc' | null }>({
    field: null,
    direction: null,
  });

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return { field: null, direction: null };
    });
  };

  // Calculate totals and ranks (Only using main subjects, skipping sub-metrics)
  const rankedStudents = useMemo(() => {
    const isSem1 = selectedPeriod === 'sem1-summary';
    const isSem2 = selectedPeriod === 'sem2-summary';
    const isAnnual = selectedPeriod === 'annual';
    const totalCoefficient = maxTotalScore / 50;

    let computedList = [...filteredStudents].map((std) => {
      const studentScores = matrixData[std.id] || {};
      const totalScore = activeSchema.subjects.reduce((sum, sub) => sum + (studentScores[sub.id] || 0), 0);
      
      let breakdown: any = {};
      let average = 0;
      
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
        
        average = totalScore / totalCoefficient;
        breakdown = {
          examScore: examTotal,
          examAvg: examTotal / totalCoefficient,
          monthlyAvg: monthlyTotal / totalCoefficient,
          semesterAvg: average
        };
      } else if (isAnnual) {
        let sem1m1 = 0, sem1m2 = 0, sem1m3 = 0, sem1exam = 0;
        let sem2m1 = 0, sem2m2 = 0, sem2m3 = 0, sem2exam = 0;
        
        const dec = rawGradesData.find(g => g.student_id === std.id && g.period === 'dec')?.scores || {};
        const jan = rawGradesData.find(g => g.student_id === std.id && g.period === 'jan')?.scores || {};
        const feb = rawGradesData.find(g => g.student_id === std.id && g.period === 'feb')?.scores || {};
        const s1ex = rawGradesData.find(g => g.student_id === std.id && g.period === 'sem1-exam')?.scores || {};
        
        const may = rawGradesData.find(g => g.student_id === std.id && g.period === 'may')?.scores || {};
        const jun = rawGradesData.find(g => g.student_id === std.id && g.period === 'jun')?.scores || {};
        const jul = rawGradesData.find(g => g.student_id === std.id && g.period === 'jul')?.scores || {};
        const s2ex = rawGradesData.find(g => g.student_id === std.id && g.period === 'sem2-exam')?.scores || {};
        
        activeSchema.subjects.forEach(sub => {
          sem1m1 += dec[sub.id] || 0;
          sem1m2 += jan[sub.id] || 0;
          sem1m3 += feb[sub.id] || 0;
          sem1exam += s1ex[sub.id] || 0;
          
          sem2m1 += may[sub.id] || 0;
          sem2m2 += jun[sub.id] || 0;
          sem2m3 += jul[sub.id] || 0;
          sem2exam += s2ex[sub.id] || 0;
        });
        
        const trueSem1Avg = ((((sem1m1 + sem1m2 + sem1m3) / 3) + sem1exam) / 2) / totalCoefficient;
        const trueSem2Avg = ((((sem2m1 + sem2m2 + sem2m3) / 3) + sem2exam) / 2) / totalCoefficient;
        
        average = (trueSem1Avg + trueSem2Avg) / 2;
        
        breakdown = {
          sem1Avg: trueSem1Avg,
          sem2Avg: trueSem2Avg,
          annualAvg: average
        };
      } else {
        average = totalScore / totalCoefficient;
      }

      let grade = 'F';
      if (average >= 42.5) grade = 'A';
      else if (average >= 40.0) grade = 'B';
      else if (average >= 35.0) grade = 'C';
      else if (average >= 30.0) grade = 'D';
      else if (average >= 25.0) grade = 'E';

      return { ...std, totalScore, grade, percentage: average, breakdown };
    }).sort((a, b) => b.totalScore - a.totalScore);

    // Attach fixed rank based on total score
    const withRank = computedList.map((std, idx) => ({ ...std, rank: idx + 1 }));

    if (sortState.field && sortState.direction) {
      const { field, direction } = sortState;
      const factor = direction === 'asc' ? 1 : -1;

      return [...withRank].sort((a: any, b: any) => {
        let valA = a[field];
        let valB = b[field];

        if (field.startsWith('sub_')) {
          const subId = field.replace('sub_', '');
          valA = matrixData[a.id]?.[subId] || 0;
          valB = matrixData[b.id]?.[subId] || 0;
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * factor;
        }

        return String(valA).localeCompare(String(valB), 'km', { numeric: true }) * factor;
      });
    }

    return withRank;
  }, [filteredStudents, matrixData, rawGradesData, activeSchema, maxTotalScore, selectedPeriod, sortState]);

  const renderSortHeader = (label: React.ReactNode, field: string, align: 'left' | 'center' | 'right' = 'center', className: string = '') => {
    const isActive = sortState.field === field && sortState.direction !== null;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`cursor-pointer select-none hover:bg-blue-100/90 transition-colors group ${className}`}
      >
        <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">
            {isActive ? (
              sortState.direction === 'asc' ? (
                <ArrowUp className="w-3 h-3 text-[#155EEF] font-bold" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[#155EEF] font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 opacity-60 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

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

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-black shadow-sm flex items-center gap-2 transition-all scale-[1.01]"
          >
            <Upload className="w-4 h-4" />
            <span>នាំចូលពិន្ទុ</span>
          </button>
          
          <button
            onClick={() => setIsGeipModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-black shadow-sm flex items-center gap-2 transition-all scale-[1.01]"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-700" />
            <span>Export GEIP ៣.១.៤</span>
          </button>

          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-black shadow-sm flex items-center gap-2 transition-all scale-[1.01] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'កំពុងទាញយក...' : 'ទាញយកគំរូ Excel'}</span>
          </button>

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

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យ...</div>
      ) : students.length === 0 || Object.keys(matrixData).length === 0 ? (
        <div className="bg-white p-12 rounded-[24px] border border-slate-200 shadow-2xs text-center flex flex-col items-center justify-center">
           <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
           <h2 className="text-xl font-black text-slate-800 mb-2">មិនទាន់មានទិន្នន័យ</h2>
           <p className="text-sm font-semibold text-slate-500 max-w-md">
             មិនមានទិន្នន័យសិស្ស ឬពិន្ទុសម្រាប់ថ្នាក់នេះក្នុង {ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label} ទេ។ ប្រសិនបើអ្នកមិនទាន់បានបញ្ចូលពិន្ទុទេ សូមទាក់ទង Admin ឲ្យជួយរៀបចំទិន្នន័យ។
           </p>
        </div>
      ) : (
      <>
        {/* Massive Matrix Table */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                <th className="py-4 px-3 w-10 text-center sticky left-0 bg-slate-100 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">ល.រ</th>
                {renderSortHeader('អត្តលេខ', 'student_id_number', 'center', 'py-4 px-3 sticky left-[40px] bg-slate-100 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]')}
                {renderSortHeader('គោត្តនាម & នាម', 'full_name', 'left', 'py-4 px-4 sticky left-[100px] bg-slate-100 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[160px]')}
                
                {!isSummaryPeriod && !isAnnual ? (
                  <>
                    {renderSortHeader(<>ពិន្ទុសរុប<br/>({maxTotalScore})</>, 'totalScore', 'center', 'py-4 px-3 bg-blue-100/80 text-blue-900 border-r border-blue-200 min-w-[90px]')}
                    {renderSortHeader(<>មធ្យមភាគ<br/>(50)</>, 'percentage', 'center', 'py-4 px-3 bg-blue-100/80 text-blue-900 border-r border-blue-200 min-w-[90px]')}
                    {renderSortHeader(<>ចំណាត់<br/>ថ្នាក់</>, 'rank', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader('និទ្ទេស', 'grade', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    
                    {flatColumns.map(col => (
                      <th 
                        key={col.id} 
                        onClick={() => handleSort(`sub_${col.id}`)}
                        className={`py-2 px-1 text-center border-r border-slate-200 min-w-[70px] cursor-pointer select-none hover:bg-amber-100/80 transition-colors group ${!col.isMain ? 'bg-amber-50/80' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-0.5 w-full">
                            <span className={`truncate text-[9px] ${!col.isMain ? 'text-amber-700 font-black' : 'text-slate-700 font-bold'}`}>
                              {col.label}
                            </span>
                            <span className="text-slate-400">
                              {sortState.field === `sub_${col.id}` && sortState.direction !== null ? (
                                sortState.direction === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-[#155EEF]" /> : <ArrowDown className="w-2.5 h-2.5 text-[#155EEF]" />
                              ) : null}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                            !col.isMain ? 'bg-white text-amber-600 border border-amber-200' : 'bg-white text-[#155EEF] border border-slate-200'
                          }`}>
                            {col.maxScore}
                          </span>
                        </div>
                      </th>
                    ))}
                  </>
                ) : isSummaryPeriod ? (
                  <>
                    {renderSortHeader(<>ពិន្ទុប្រលង<br/>ឆមាស</>, 'examScore', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>ម.ប្រលង<br/>ឆមាស</>, 'examAvg', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>ម.ខែ<br/>ឆមាស</>, 'monthlyAvg', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>ម.ប្រចាំ<br/>ឆមាស</>, 'percentage', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>និទ្ទេស<br/>ប្រចាំឆ.</>, 'grade', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>ចំ.<br/>ថ្នាក់</>, 'rank', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                  </>
                ) : (
                  <>
                    {renderSortHeader(<>មធ្យមភាគ<br/>ឆមាសទី១</>, 'sem1Avg', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>មធ្យមភាគ<br/>ឆមាសទី២</>, 'sem2Avg', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>មធ្យមភាគ<br/>ប្រចាំឆ្នាំ</>, 'percentage', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>និទ្ទេស<br/>រួម</>, 'grade', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                    {renderSortHeader(<>ចំ.<br/>ថ្នាក់</>, 'rank', 'center', 'py-4 px-2 bg-blue-100/80 text-blue-900 border-r border-blue-200')}
                  </>
                )}
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
                  {!isSummaryPeriod && !isAnnual ? (
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
                      
                      {flatColumns.map(col => {
                        const val = matrixData[std.id]?.[col.id];
                        return (
                          <td key={col.id} className={`p-0 border-r border-slate-100 ${!col.isMain ? 'bg-amber-50/30' : ''}`}>
                            <input
                              type="number"
                              className={`w-full h-full min-h-[44px] text-center font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-[#155EEF] transition-all bg-transparent ${
                                val === undefined ? 'text-slate-300' :
                                val < (col.maxScore / 2) ? 'text-rose-500' : 'text-slate-700'
                              }`}
                              value={val !== undefined ? val : ''}
                              readOnly
                              placeholder="-"
                            />
                          </td>
                        );
                      })}
                    </>
                  ) : isSummaryPeriod ? (
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
                  ) : (
                    <>
                      <td className="py-3 px-2 text-center bg-blue-50/40 font-bold text-sm text-slate-700 border-r border-slate-100">
                        {(std as any).breakdown?.sem1Avg?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 font-bold text-sm text-slate-700 border-r border-slate-100">
                        {(std as any).breakdown?.sem2Avg?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-2 text-center bg-blue-50/40 font-black text-sm text-emerald-700 border-r border-slate-100">
                        {(std as any).breakdown?.annualAvg?.toFixed(2) || '0.00'}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
      
      <ClassGradeImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
           // Reload page or re-fetch data to reflect imported grades
           window.location.reload();
        }}
        classId={activeClass?.id || ''}
        className={activeClass?.name || ''}
        period={selectedPeriod}
        students={students}
        flatColumns={flatColumns}
      />

      <GeipExportModal
        isOpen={isGeipModalOpen}
        onClose={() => setIsGeipModalOpen(false)}
        className={activeClass?.name || ''}
        periodLabel={ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label || selectedPeriod}
        periodKey={selectedPeriod}
        students={students}
        matrixData={matrixData}
        activeSchema={activeSchema}
        maxTotalScore={maxTotalScore}
      />
    </div>
  );
}
