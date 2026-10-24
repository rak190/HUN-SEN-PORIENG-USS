'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCheck,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  MassiveProfilingStudent,
  OfficialTemplateType,
  parseOfficialExcelRow,
  normalizeKhmerDigits,
  ParsedOfficialExcelCandidate
} from '@/app/(dashboard)/students/types';

interface StudentExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: MassiveProfilingStudent[];
  activeClass?: {
    id: string;
    name: string;
    grade?: number | string;
  } | null;
  onApplyUpdates: (updates: Record<string, Partial<MassiveProfilingStudent>>) => void;
}

export default function StudentExcelImportModal({
  isOpen,
  onClose,
  students,
  activeClass,
  onApplyUpdates,
}: StudentExcelImportModalProps) {
  // Auto-detect template: Grade 10-12 uses upper secondary template, otherwise Grade 7-9
  const defaultTemplate: OfficialTemplateType = useMemo(() => {
    const rawGrade = activeClass?.grade;
    const gradeNum = rawGrade ? parseInt(String(rawGrade), 10) : undefined;
    if (gradeNum && gradeNum >= 10) return '10-12';
    // If class name contains 10, 11, 12
    const name = activeClass?.name || '';
    if (name.includes('10') || name.includes('11') || name.includes('12') || name.includes('១០') || name.includes('១១') || name.includes('១២')) {
      return '10-12';
    }
    return '7-9';
  }, [activeClass]);

  const [template, setTemplate] = useState<OfficialTemplateType>(defaultTemplate);
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Extracted and matched results
  const [parsedRows, setParsedRows] = useState<ParsedOfficialExcelCandidate[]>([]);
  const [matchedUpdates, setMatchedUpdates] = useState<Record<string, Partial<MassiveProfilingStudent>>>({});
  const [unmatchedRows, setUnmatchedRows] = useState<Array<{ rowIdx: number; id?: string; name?: string; reason: string }>>([]);

  useEffect(() => {
    setTemplate(defaultTemplate);
  }, [defaultTemplate]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setPastedText('');
      setParsedRows([]);
      setMatchedUpdates({});
      setUnmatchedRows([]);
      setFileName(null);
    }
  }, [isOpen]);

  const isHeaderRow = (cells: string[]): boolean => {
    if (cells.length === 0) return true;
    const joined = cells.join(' ').toLowerCase();
    if (
      joined.includes('ព្រះរាជាណាចក្រ') ||
      joined.includes('ជាតិ សាសនា') ||
      joined.includes('មន្ទីរអប់រំ') ||
      joined.includes('អនុវិ') ||
      joined.includes('ព័ត៌មានសិស្ស') ||
      joined.includes('ឆ្នាំសិក្សា') ||
      joined.includes('គោត្តនាម') ||
      joined.includes('អត្តលេខ') ||
      (cells[0] && cells[0].includes('ល.រ')) ||
      (cells[14] && cells[14].includes('ភូមិ')) ||
      (cells[17] && cells[17].includes('ភូមិ'))
    ) {
      return true;
    }
    const cell1 = cells[1]?.trim();
    const cell2 = cells[2]?.trim();
    if (!cell1 && !cell2) return true;
    return false;
  };

  const processMatrix = (matrix: string[][]) => {
    setIsProcessing(true);
    try {
      const candidates: ParsedOfficialExcelCandidate[] = [];
      const updatesMap: Record<string, Partial<MassiveProfilingStudent>> = {};
      const unmatched: Array<{ rowIdx: number; id?: string; name?: string; reason: string }> = [];

      let dataRowCounter = 0;
      matrix.forEach((cells, originalIndex) => {
        if (!cells || cells.length < 2) return;
        if (isHeaderRow(cells)) return;

        dataRowCounter++;
        const candidate = parseOfficialExcelRow(template, cells, dataRowCounter);
        candidates.push(candidate);

        // 1. Primary matching by Student ID Number
        const idQuery = candidate.student_id_number ? normalizeKhmerDigits(candidate.student_id_number).trim() : '';
        let matchedStudent = idQuery
          ? students.find(s => s.student_id_number && normalizeKhmerDigits(s.student_id_number).trim() === idQuery)
          : undefined;

        // 2. Secondary fallback matching by Full Name + Gender
        if (!matchedStudent && candidate.full_name?.trim()) {
          const normName = candidate.full_name.trim();
          matchedStudent = students.find(s => {
            const sName = s.full_name?.trim();
            if (sName !== normName) return false;
            if (candidate.gender && s.gender) {
              return s.gender === candidate.gender;
            }
            return true;
          });
        }

        if (matchedStudent) {
          // Construct non-destructive patch (only non-blank cells in Excel update existing record)
          const patch: Partial<MassiveProfilingStudent> = {};

          if (candidate.full_name?.trim()) patch.full_name = candidate.full_name.trim();
          if (candidate.gender) patch.gender = candidate.gender;
          if (candidate.date_of_birth) {
            patch.date_of_birth = candidate.date_of_birth;
            patch.dob = candidate.date_of_birth;
          }
          if (candidate.room_number?.trim()) patch.room_number = candidate.room_number.trim();
          if (candidate.desk_number?.trim()) patch.desk_number = candidate.desk_number.trim();
          if (candidate.prev_school?.trim()) patch.prev_school = candidate.prev_school.trim();
          if (candidate.father_name?.trim()) patch.father_name = candidate.father_name.trim();
          if (candidate.father_job?.trim()) patch.father_job = candidate.father_job.trim();
          if (candidate.father_phone?.trim()) patch.father_phone = candidate.father_phone.trim();
          if (candidate.mother_name?.trim()) patch.mother_name = candidate.mother_name.trim();
          if (candidate.mother_job?.trim()) patch.mother_job = candidate.mother_job.trim();
          if (candidate.mother_phone?.trim()) patch.mother_phone = candidate.mother_phone.trim();
          if (candidate.address?.trim()) patch.address = candidate.address.trim();
          if (candidate.student_phone?.trim()) patch.student_phone = candidate.student_phone.trim();
          if (candidate.indigenous) patch.indigenous = candidate.indigenous;
          if (candidate.scholarship) patch.scholarship = candidate.scholarship;
          if (candidate.disability) patch.disability = candidate.disability;
          if (candidate.id_poor) patch.id_poor = candidate.id_poor;

          // Merge parent_phone fallback
          if (!patch.parent_phone) {
            patch.parent_phone = patch.father_phone || patch.mother_phone || matchedStudent.parent_phone;
          }

          updatesMap[matchedStudent.id] = {
            ...(updatesMap[matchedStudent.id] || {}),
            ...patch,
          };
        } else {
          unmatched.push({
            rowIdx: dataRowCounter,
            id: candidate.student_id_number,
            name: candidate.full_name,
            reason: 'រកមិនឃើញក្នុងបញ្ជីថ្នាក់បច្ចុប្បន្ន',
          });
        }
      });

      setParsedRows(candidates);
      setMatchedUpdates(updatesMap);
      setUnmatchedRows(unmatched);
    } catch (err) {
      console.error('Error processing Excel matrix:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.trim().split(/\r?\n/);
    const matrix = lines.map(line => line.split('\t'));
    processMatrix(matrix);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Auto-select sheet matching template
        let sheetName = workbook.SheetNames[0];
        if (template === '10-12') {
          const found = workbook.SheetNames.find(n => n.includes('10-12') || n.includes('១០-១២'));
          if (found) sheetName = found;
        } else {
          const found = workbook.SheetNames.find(n => n.includes('7-9') || n.includes('៧-៩'));
          if (found) sheetName = found;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const matrix: string[][] = rawJson.map(row => row.map(v => String(v ?? '')));
        processMatrix(matrix);
      } catch (err) {
        console.error('Error reading Excel file:', err);
        alert('មិនអាចអានឯកសារ Excel បានទេ សូមពិនិត្យទម្រង់ឯកសារម្តងទៀត');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const matchedCount = Object.keys(matchedUpdates).length;

  const handleConfirmApply = () => {
    if (matchedCount === 0) return;
    onApplyUpdates(matchedUpdates);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight flex items-center gap-2">
                នាំចូលពី Excel គំរូផ្លូវការដើមឆ្នាំ (Official Template Import)
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-normal">
                  MoEYS Template
                </span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                ចម្លងទិន្នន័យ (Copy/Paste) ពីឯកសារ Excel គំរូដើមឆ្នាំរបស់ក្រសួង/សាលា ដើម្បីបំពេញប្រវត្តិរូបសិស្សស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              ថ្នាក់គោលដៅ:
            </span>
            <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              {activeClass?.name || 'មិនទាន់ជ្រើសរើសថ្នាក់'}
            </span>
          </div>

          {/* Template Selector Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              ទម្រង់ឯកសារ Excel:
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setTemplate('7-9')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  template === '7-9'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                ថ្នាក់ទី ៧-៩ (កម្រិតអនុវិទ្យាល័យ)
              </button>
              <button
                type="button"
                onClick={() => setTemplate('10-12')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  template === '10-12'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                ថ្នាក់ទី ១០-១២ (កម្រិតវិទ្យាល័យ / មានបន្ទប់ និងលេខតុ)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Skipped Operational Notice */}
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">កំណត់សម្គាល់អំពីទិន្នន័យប្រតិបត្តិការ (Safe Column Demarcation):</p>
              <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                ជួរឈរប្រតិបត្តិការក្នុងឯកសារ Excel (រួមមាន ពិន្ទុប្រចាំខែ, អវត្តមាន, និងតួនាទីសិស្ស) ត្រូវបានរំលងដោយសុវត្ថិភាព។ 
                ទិន្នន័យពិន្ទុត្រូវបញ្ចូលក្នុងផ្ទាំង <span className="font-semibold">"ពិន្ទុ (Grades)"</span> ហើយអវត្តមានត្រូវកត់ត្រាក្នុង <span className="font-semibold">"វត្តមាន (Attendance)"</span>។
              </p>
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'paste'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              ចម្លង-បិទភ្ជាប់ (Paste from Clipboard)
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'file'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              ជ្រើសរើសឯកសារ Excel (.xlsx, .xls)
            </button>
          </div>

          {/* Paste Tab Content */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`ចុចទីនេះ រួចចុចបញ្ជា Ctrl + V (បិទភ្ជាប់) ទិន្នន័យដែលបាន Copy ពី Excel គំរូ...\n\nគន្លឹះ៖ លោកអ្នកអាច Copy ដោយភ្ជាប់ជួរក្បាលតារាង (Headers) ឬ Copy តែជួរទិន្នន័យសិស្សសុទ្ធក៏បាន ប្រព័ន្ធនឹងស្វែងយល់ និងផ្គូផ្គងស្វ័យប្រវត្ត។`}
                  rows={6}
                  className="w-full text-xs font-mono p-3.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  * គាំទ្រការ Copy ពី Sheet &quot;បញ្ជីឈ្មោះសិស្ស7-9&quot; ឬ &quot;បញ្ជីឈ្មោះសិស្ស 10-12&quot;
                </p>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim() || isProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      កំពុងដំណើរការ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      ដំណើរការទិន្នន័យ (Process Data)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* File Upload Tab Content */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {fileName ? fileName : 'ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ Excel ឬទម្លាក់ឯកសារទីនេះ'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  គាំទ្រប្រភេទឯកសារ .xlsx, .xls
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Results & Summary */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500">បានអានសរុប: </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{parsedRows.length} ជួរ</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ផ្គូផ្គងជោគជ័យ: </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{matchedCount} នាក់</span>
                  </div>
                  {unmatchedRows.length > 0 && (
                    <div>
                      <span className="text-slate-500">មិនស្គាល់/ក្រៅបញ្ជី: </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{unmatchedRows.length} ជួរ</span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  * ទិន្នន័យទទេក្នុង Excel មិនធ្វើឱ្យបាត់បង់ទិន្នន័យដែលមានស្រាប់ទេ (Non-destructive policy)
                </div>
              </div>

              {/* Unmatched Warnings Card */}
              {unmatchedRows.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    សិស្សដែលមិនស្គាល់ក្នុងថ្នាក់នេះ ({unmatchedRows.length} នាក់)
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    យោងតាមគោលការណ៍សុវត្ថិភាព គ្រូបន្ទុកថ្នាក់អាចកែប្រែបានតែសិស្សដែលមានឈ្មោះក្នុងបញ្ជីថ្នាក់ស្រាប់ប៉ុណ្ណោះ។ 
                    សិស្សថ្មីត្រូវស្នើសុំតាមរយៈគណនី Admin ឬ នាយកសាលា។
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unmatchedRows.slice(0, 10).map((u, idx) => (
                      <span key={idx} className="bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded text-[11px]">
                        ជួរ {u.rowIdx}: {u.name || u.id || 'អនាមិក'}
                      </span>
                    ))}
                    {unmatchedRows.length > 10 && (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 self-center">
                        ...និង {unmatchedRows.length - 10} នាក់ទៀត
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Matched Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    មើលទិដ្ឋភាពទិន្នន័យដែលនឹងត្រូវធ្វើបច្ចុប្បន្នភាព ({matchedCount} នាក់)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 sticky top-0">
                        <th className="p-2.5 text-center w-10">ល.រ</th>
                        <th className="p-2.5 font-mono">អត្តលេខ</th>
                        <th className="p-2.5">គោត្តនាម-នាម</th>
                        <th className="p-2.5 text-center">ភេទ</th>
                        <th className="p-2.5">ថ្ងៃកំណើត</th>
                        <th className="p-2.5">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                        <th className="p-2.5">ឪពុក/ម្តាយ</th>
                        <th className="p-2.5 font-mono">ទូរស័ព្ទ</th>
                        <th className="p-2.5 text-center">ក្រីក្រ</th>
                        {template === '10-12' && (
                          <>
                            <th className="p-2.5 text-center">បន្ទប់</th>
                            <th className="p-2.5 text-center">លេខតុ</th>
                          </>
                        )}
                        <th className="p-2.5 text-center">ចំនួនកែប្រែ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {students
                        .filter(s => matchedUpdates[s.id])
                        .map((std, idx) => {
                          const patch = matchedUpdates[std.id];
                          const fieldCount = Object.keys(patch).length;
                          return (
                            <tr key={std.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                                {std.student_id_number || '-'}
                              </td>
                              <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">
                                {patch.full_name || std.full_name}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  (patch.gender || std.gender) === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {(patch.gender || std.gender) === 'F' ? 'ស្រី' : 'ប្រុស'}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                {patch.date_of_birth || std.date_of_birth || '-'}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-300 max-w-xs truncate text-[11px]">
                                {patch.address || std.address || '-'}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                                {patch.father_name || patch.mother_name || std.father_name || std.mother_name || '-'}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                {patch.student_phone || patch.father_phone || patch.mother_phone || std.student_phone || '-'}
                              </td>
                              <td className="p-2.5 text-center">
                                {(patch.id_poor || std.id_poor) === 'level_1' ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">ក្រ១</span>
                                ) : (patch.id_poor || std.id_poor) === 'level_2' ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">ក្រ២</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">គ្មាន</span>
                                )}
                              </td>
                              {template === '10-12' && (
                                <>
                                  <td className="p-2.5 text-center font-mono text-[11px]">
                                    {patch.room_number || std.room_number || '-'}
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-[11px]">
                                    {patch.desk_number || std.desk_number || '-'}
                                  </td>
                                </>
                              )}
                              <td className="p-2.5 text-center">
                                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                  +{fieldCount} វាល
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            បោះបង់ (Cancel)
          </button>

          <button
            type="button"
            onClick={handleConfirmApply}
            disabled={matchedCount === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            ផ្ទេរទិន្នន័យ {matchedCount} នាក់ ទៅក្នុងតារាង (Apply to Table Draft)
          </button>
        </div>

      </div>
    </div>
  );
}
