'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileSpreadsheet,
  Upload,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  FileCheck,
  Loader2,
  UploadCloud
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
  const [mounted, setMounted] = useState(false);

  // Auto-detect template: Grade 10-12 uses upper secondary template, otherwise Grade 7-9
  const defaultTemplate: OfficialTemplateType = useMemo(() => {
    const rawGrade = activeClass?.grade;
    const gradeNum = rawGrade ? parseInt(String(rawGrade), 10) : undefined;
    if (gradeNum && gradeNum >= 10) return '10-12';
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
    setMounted(true);
  }, []);

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
      matrix.forEach((cells) => {
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

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header matching BulkImageUploadModal */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#155EEF] flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              នាំចូលទិន្នន័យពី Excel គំរូដើមឆ្នាំ
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              ចម្លង-បិទភ្ជាប់ (Copy/Paste) ឬជ្រើសរើសឯកសារ Excel ដើមឆ្នាំរបស់ក្រសួង/សាលា ដើម្បីបំពេញទិន្នន័យស្វ័យប្រវត្តិ។
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="px-6 py-3.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-600">ថ្នាក់គោលដៅ៖</span>
            <span className="text-xs font-black bg-blue-50 text-[#155EEF] px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
              {activeClass?.name || 'មិនទាន់ជ្រើសរើសថ្នាក់'}
            </span>
          </div>

          {/* Template Selector Toggle */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-600">ទម្រង់ឯកសារ Excel៖</span>
            <div className="inline-flex rounded-xl p-1 bg-slate-200/70 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setTemplate('7-9')}
                className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  template === '7-9'
                    ? 'bg-white text-[#155EEF] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ថ្នាក់ទី ៧-៩ (កម្រិតអនុវិទ្យាល័យ)
              </button>
              <button
                type="button"
                onClick={() => setTemplate('10-12')}
                className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  template === '10-12'
                    ? 'bg-white text-[#155EEF] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ថ្នាក់ទី ១០-១២ (កម្រិតវិទ្យាល័យ / មានបន្ទប់ & លេខតុ)
              </button>
            </div>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50/50 p-6 space-y-5 custom-scrollbar">

          {/* Safe Column Notice */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
            <Info className="w-5 h-5 text-[#155EEF] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">កំណត់សម្គាល់សុវត្ថិភាពទិន្នន័យ (Safe Column Demarcation)៖</p>
              <p className="mt-0.5 text-slate-600 leading-relaxed font-semibold">
                ជួរឈរប្រតិបត្តិការក្នុងឯកសារ Excel (រួមមាន ពិន្ទុប្រចាំខែ, អវត្តមាន, និងតួនាទីសិស្ស) ត្រូវបានរំលងដោយសុវត្ថិភាព។ 
                ពិន្ទុត្រូវបញ្ចូលក្នុងផ្ទាំង <span className="font-bold text-[#155EEF]">&quot;ពិន្ទុ (Grades)&quot;</span> ហើយអវត្តមានត្រូវកត់ត្រាក្នុង <span className="font-bold text-[#155EEF]">&quot;វត្តមាន (Attendance)&quot;</span>។
              </p>
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="flex border-b border-slate-200 gap-6 shrink-0">
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-[#155EEF] text-[#155EEF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              ចម្លង-បិទភ្ជាប់ (Paste from Clipboard)
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'file'
                  ? 'border-[#155EEF] text-[#155EEF]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
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
                  className="w-full text-xs font-mono p-4 border-2 border-slate-200 rounded-2xl bg-white focus:border-[#155EEF] focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-500">
                  * គាំទ្រការ Copy ពី Sheet &quot;បញ្ជីឈ្មោះសិស្ស7-9&quot; ឬ &quot;បញ្ជីឈ្មោះសិស្ស 10-12&quot;
                </p>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim() || isProcessing}
                  className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-md cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      កំពុងដំណើរការ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
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
              <label className="w-full border-4 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#155EEF] hover:bg-blue-50/50 transition-colors bg-white">
                <div className="w-20 h-20 bg-blue-100 text-[#155EEF] rounded-full flex items-center justify-center mb-4 shadow-xs">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">
                  {fileName ? fileName : 'ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ Excel'}
                </h3>
                <p className="text-slate-500 font-semibold mb-5 max-w-md text-xs">
                  ជ្រើសរើសឯកសារ Excel គំរូដើមឆ្នាំ (.xlsx, .xls)។ ប្រព័ន្ធនឹងអានសន្លឹកកិច្ចការស្វ័យប្រវត្តិតាមកម្រិតថ្នាក់។
                </p>
                <span className="px-8 py-3 bg-[#155EEF] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-colors cursor-pointer text-xs">
                  ជ្រើសរើសឯកសារ (Select Excel)
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

          {/* Results Summary & Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-xs">
                <div className="flex items-center gap-5">
                  <div>
                    <span className="text-slate-500 font-semibold">បានអានសរុប៖ </span>
                    <span className="font-black text-slate-800">{parsedRows.length} ជួរ</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200"></div>
                  <div>
                    <span className="text-slate-500 font-semibold">ផ្គូផ្គងជោគជ័យ៖ </span>
                    <span className="font-black text-emerald-600">{matchedCount} នាក់</span>
                  </div>
                  {unmatchedRows.length > 0 && (
                    <>
                      <div className="h-4 w-px bg-slate-200"></div>
                      <div>
                        <span className="text-slate-500 font-semibold">មិនស្គាល់/ក្រៅបញ្ជី៖ </span>
                        <span className="font-black text-amber-600">{unmatchedRows.length} ជួរ</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-semibold">
                  * ទិន្នន័យទទេក្នុង Excel មិនធ្វើឱ្យបាត់បង់ទិន្នន័យដែលមានស្រាប់ទេ (Non-destructive policy)
                </div>
              </div>

              {/* Unmatched Warnings Card */}
              {unmatchedRows.length > 0 && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2 font-black mb-1 text-slate-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    សិស្សដែលមិនស្គាល់ក្នុងថ្នាក់នេះ ({unmatchedRows.length} នាក់)
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    យោងតាមគោលការណ៍សុវត្ថិភាព គ្រូបន្ទុកថ្នាក់អាចកែប្រែបានតែសិស្សដែលមានឈ្មោះក្នុងបញ្ជីថ្នាក់ស្រាប់ប៉ុណ្ណោះ។ 
                    សិស្សថ្មីត្រូវស្នើសុំតាមរយៈគណនី Admin ឬ នាយកសាលា។
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {unmatchedRows.slice(0, 10).map((u, idx) => (
                      <span key={idx} className="bg-white border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs">
                        ជួរ {u.rowIdx}៖ {u.name || u.id || 'អនាមិក'}
                      </span>
                    ))}
                    {unmatchedRows.length > 10 && (
                      <span className="text-[11px] text-amber-700 font-bold self-center">
                        ...និង {unmatchedRows.length - 10} នាក់ទៀត
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Matched Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#155EEF]" />
                    ទិដ្ឋភាពទិន្នន័យដែលនឹងត្រូវធ្វើបច្ចុប្បន្នភាព ({matchedCount} នាក់)
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    សូមពិនិត្យមុននឹងចុចផ្ទេរទិន្នន័យ
                  </span>
                </div>
                <div className="overflow-x-auto max-h-64 custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 sticky top-0 font-bold">
                        <th className="p-3 text-center w-12">ល.រ</th>
                        <th className="p-3 font-mono">អត្តលេខ</th>
                        <th className="p-3">គោត្តនាម-នាម</th>
                        <th className="p-3 text-center">ភេទ</th>
                        <th className="p-3">ថ្ងៃកំណើត</th>
                        <th className="p-3">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                        <th className="p-3">ឪពុក/ម្តាយ</th>
                        <th className="p-3 font-mono">ទូរស័ព្ទ</th>
                        <th className="p-3 text-center">ក្រីក្រ</th>
                        {template === '10-12' && (
                          <>
                            <th className="p-3 text-center">បន្ទប់</th>
                            <th className="p-3 text-center">លេខតុ</th>
                          </>
                        )}
                        <th className="p-3 text-center">ចំនួនកែប្រែ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {students
                        .filter(s => matchedUpdates[s.id])
                        .map((std, idx) => {
                          const patch = matchedUpdates[std.id];
                          const fieldCount = Object.keys(patch).length;
                          return (
                            <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-mono text-[#155EEF] font-bold">
                                {std.student_id_number || '-'}
                              </td>
                              <td className="p-3 font-bold text-slate-900">
                                {patch.full_name || std.full_name}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  (patch.gender || std.gender) === 'F' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {(patch.gender || std.gender) === 'F' ? 'ស្រី' : 'ប្រុស'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 font-mono text-[11px]">
                                {patch.date_of_birth || std.date_of_birth || '-'}
                              </td>
                              <td className="p-3 text-slate-600 max-w-xs truncate text-[11px]">
                                {patch.address || std.address || '-'}
                              </td>
                              <td className="p-3 text-slate-600 text-[11px]">
                                {patch.father_name || patch.mother_name || std.father_name || std.mother_name || '-'}
                              </td>
                              <td className="p-3 font-mono text-[11px] text-slate-600">
                                {patch.student_phone || patch.father_phone || patch.mother_phone || std.student_phone || '-'}
                              </td>
                              <td className="p-3 text-center">
                                {(patch.id_poor || std.id_poor) === 'level_1' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">ក្រ១</span>
                                ) : (patch.id_poor || std.id_poor) === 'level_2' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">ក្រ២</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">គ្មាន</span>
                                )}
                              </td>
                              {template === '10-12' && (
                                <>
                                  <td className="p-3 text-center font-mono text-[11px]">
                                    {patch.room_number || std.room_number || '-'}
                                  </td>
                                  <td className="p-3 text-center font-mono text-[11px]">
                                    {patch.desk_number || std.desk_number || '-'}
                                  </td>
                                </>
                              )}
                              <td className="p-3 text-center">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
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

        {/* Footer matching BulkImageUploadModal */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer text-xs"
          >
            បោះបង់ (Cancel)
          </button>

          <button
            type="button"
            onClick={handleConfirmApply}
            disabled={matchedCount === 0}
            className="px-8 py-2.5 bg-[#155EEF] disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ផ្ទេរទិន្នន័យ {matchedCount} នាក់ ទៅក្នុងតារាង (Apply to Table Draft)</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
