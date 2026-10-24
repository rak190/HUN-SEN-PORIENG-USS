'use client';

import React, { useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  MassiveProfilingStudent, 
  calculateProfileCompleteness,
  normalizeKhmerDigits,
  normalizePastedCell
} from '@/app/(dashboard)/students/types';
import { UserSquare2, Edit, LogOut, ArrowUpDown, ArrowUp, ArrowDown, Heart, AlertCircle, AlertTriangle, Check, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export { normalizeKhmerDigits, normalizePastedCell };

interface StudentTableProps {
  students: MassiveProfilingStudent[];
  setStudents: React.Dispatch<React.SetStateAction<MassiveProfilingStudent[]>>;
  filteredStudents: MassiveProfilingStudent[];
  activeTableView: number;
  sortState: { field: string | null; direction: 'asc' | 'desc' | null };
  handleSort: (field: string) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  openEditModal: (std: MassiveProfilingStudent) => void;
  openStatusModal: (std: MassiveProfilingStudent) => void;
  // In-Place Edit Mode additions
  isEditMode?: boolean;
  draftUpdates?: Record<string, Partial<MassiveProfilingStudent>>;
  onCellChange?: (studentId: string, field: string, value: any) => void;
  onBatchDraftChange?: (updates: Record<string, Partial<MassiveProfilingStudent>>) => void;
}

export default function StudentTable({
  students,
  setStudents,
  filteredStudents,
  activeTableView,
  sortState,
  handleSort,
  selectedIds,
  setSelectedIds,
  openEditModal,
  openStatusModal,
  isEditMode = false,
  draftUpdates = {},
  onCellChange,
  onBatchDraftChange
}: StudentTableProps) {
  const supabase = createClient();
  const tableRef = useRef<HTMLTableElement>(null);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStudents.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // Define column keys per view
  const visibleFieldKeys = useMemo<string[]>(() => {
    if (activeTableView === 0) {
      // Master Full View
      return [
        'gender', 'desk_number', 'room_number', 'date_of_birth', 'age', 'birth_cert_no', 'student_phone',
        'status', 'prev_school', 'scholarship', 'id_poor', 'distance_km',
        'height_m', 'weight_kg', 'disability', 'health_issues',
        'father_name', 'father_job', 'father_phone', 'mother_name', 'mother_job', 'mother_phone',
        'guardian_name', 'guardian_phone', 'siblings_count', 'income',
        'address', 'migrant_status', 'housing', 'current_status'
      ];
    }
    if (activeTableView === 1) {
      return ['gender', 'desk_number', 'room_number', 'date_of_birth', 'age', 'birth_cert_no', 'student_phone'];
    }
    if (activeTableView === 2) {
      return ['status', 'prev_school', 'scholarship', 'id_poor', 'distance_km'];
    }
    if (activeTableView === 3) {
      return ['height_m', 'weight_kg', 'disability', 'health_issues'];
    }
    if (activeTableView === 4) {
      return ['father_name', 'father_job', 'father_phone', 'mother_name', 'mother_job', 'mother_phone', 'guardian_name', 'guardian_phone', 'siblings_count', 'income'];
    }
    if (activeTableView === 5) {
      return ['address', 'migrant_status', 'housing', 'current_status'];
    }
    return ['gender', 'desk_number', 'room_number', 'date_of_birth'];
  }, [activeTableView]);

  // Handle Multi-Cell Excel Clipboard Paste
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIndex: number,
    startField: string
  ) => {
    if (!isEditMode) return;
    const clipboardText = e.clipboardData.getData('text');
    if (!clipboardText || !clipboardText.trim()) return;

    e.preventDefault();

    const rawRows = clipboardText.split(/\r\n|\n|\r/).filter(r => r.length > 0);
    if (rawRows.length === 0) return;

    const startColIdx = visibleFieldKeys.indexOf(startField);
    if (startColIdx === -1) return;

    const newDrafts: Record<string, Partial<MassiveProfilingStudent>> = { ...draftUpdates };

    rawRows.forEach((rowStr, rOffset) => {
      const targetStudentIdx = startStudentIndex + rOffset;
      if (targetStudentIdx >= filteredStudents.length) return;
      const targetStudent = filteredStudents[targetStudentIdx];
      if (!targetStudent) return;

      const cells = rowStr.split('\t');
      cells.forEach((rawCell, cOffset) => {
        const targetColIdx = startColIdx + cOffset;
        if (targetColIdx >= visibleFieldKeys.length) return;
        const fieldKey = visibleFieldKeys[targetColIdx];
        const normalizedVal = normalizePastedCell(fieldKey, rawCell);

        if (!newDrafts[targetStudent.id]) {
          newDrafts[targetStudent.id] = {};
        }
        (newDrafts[targetStudent.id] as any)[fieldKey] = normalizedVal;

        // Auto calculate BMI if weight or height were pasted
        if (fieldKey === 'weight_kg' || fieldKey === 'height_m') {
          const w = fieldKey === 'weight_kg' ? normalizedVal : (newDrafts[targetStudent.id]?.weight_kg ?? targetStudent.weight_kg);
          const h = fieldKey === 'height_m' ? normalizedVal : (newDrafts[targetStudent.id]?.height_m ?? targetStudent.height_m);
          if (w && h && h > 0) {
            const bmi = parseFloat((w / (h * h)).toFixed(1));
            (newDrafts[targetStudent.id] as any).bmi = bmi;
            if (bmi < 18.5) (newDrafts[targetStudent.id] as any).nutrition_status = 'ស្គម';
            else if (bmi >= 25 && bmi < 30) (newDrafts[targetStudent.id] as any).nutrition_status = 'លើសទម្ងន់';
            else if (bmi >= 30) (newDrafts[targetStudent.id] as any).nutrition_status = 'ធាត់';
            else (newDrafts[targetStudent.id] as any).nutrition_status = 'ធម្មតា';
          }
        }
      });
    });

    onBatchDraftChange?.(newDrafts);
  };

  const renderSortHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left', extraClassName = '') => {
    const isSorted = sortState.field === field;
    return (
      <th 
        className={`p-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none whitespace-nowrap ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${extraClassName}`}
        onClick={() => handleSort(field)}
      >
        <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span className={`text-slate-400 group-hover:text-slate-600 ${isSorted ? 'text-[#155EEF] font-black' : ''}`}>
            {isSorted ? (sortState.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
          </span>
        </div>
      </th>
    );
  };

  // Helper to read current cell value (either drafted or persistent)
  const getCellValue = (std: MassiveProfilingStudent, field: string): any => {
    if (draftUpdates[std.id] && draftUpdates[std.id][field as keyof MassiveProfilingStudent] !== undefined) {
      return draftUpdates[std.id][field as keyof MassiveProfilingStudent];
    }
    return (std as any)[field] ?? '';
  };

  const isCellModified = (std: MassiveProfilingStudent, field: string): boolean => {
    if (!draftUpdates[std.id]) return false;
    const draftVal = draftUpdates[std.id][field as keyof MassiveProfilingStudent];
    if (draftVal === undefined) return false;
    const originalVal = (std as any)[field] ?? '';
    return draftVal !== originalVal;
  };

  const renderEditableCell = (
    std: MassiveProfilingStudent,
    studentIndex: number,
    field: string,
    type: 'text' | 'number' | 'date' | 'select' = 'text',
    options?: { label: string; value: string }[],
    placeholder: string = ''
  ) => {
    const val = getCellValue(std, field);
    const modified = isCellModified(std, field);

    if (!isEditMode) {
      // Clean read-only rendering
      if (type === 'select' && options) {
        const matched = options.find(o => o.value === String(val));
        return matched ? matched.label : String(val || '-');
      }
      return val ? String(val) : <span className="text-slate-300">-</span>;
    }

    if (type === 'select' && options) {
      return (
        <select
          value={String(val || '')}
          onChange={(e) => onCellChange?.(std.id, field, e.target.value)}
          className={`w-full py-1 px-1.5 rounded-md text-xs font-bold outline-none transition-all cursor-pointer border ${
            modified 
              ? 'bg-amber-50/80 border-amber-400 text-amber-900 ring-1 ring-amber-300' 
              : 'bg-white border-slate-200 hover:border-slate-300 focus:border-[#155EEF] text-slate-800'
          }`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        value={val ?? ''}
        placeholder={placeholder}
        step={field === 'height_m' ? '0.01' : undefined}
        onChange={(e) => onCellChange?.(std.id, field, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        onPaste={(e) => handleCellPaste(e, studentIndex, field)}
        className={`w-full py-1 px-2 rounded-md text-xs outline-none transition-all border ${
          modified 
            ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-black ring-1 ring-amber-300' 
            : 'bg-white border-slate-200/90 hover:border-slate-300 focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF]/20 text-slate-800 font-bold'
        }`}
      />
    );
  };

  return (
    <div className="bg-white rounded-b-[24px] border-x border-b border-slate-200 shadow-2xs -mt-6 overflow-hidden">
      <div className="overflow-x-auto relative">
        <table ref={tableRef} className="w-full text-left whitespace-nowrap border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wide">
              {/* Sticky Column 1: Checkbox */}
              <th className="p-3.5 w-12 text-center sticky left-0 bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0]">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#155EEF] cursor-pointer" 
                  checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0} 
                  onChange={handleSelectAll} 
                />
              </th>

              {/* Sticky Column 2: Student ID */}
              {renderSortHeader('អត្តលេខ', 'student_id_number', 'left', 'sticky left-12 bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0] w-28')}

              {/* Sticky Column 3: Full Name */}
              {renderSortHeader('គោត្តនាម-នាម', 'full_name', 'left', 'sticky left-40 bg-slate-50 z-30 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] min-w-[170px]')}

              {/* Dynamic Columns by Tab */}
              {activeTableView === 0 && (
                <>
                  {/* Group 1: មូលដ្ឋាន */}
                  <th className="p-3.5 text-center bg-blue-50/40 text-[#155EEF] border-l border-slate-200">ភេទ</th>
                  <th className="p-3.5 text-center bg-blue-50/40 text-[#155EEF]">លេខតុ</th>
                  <th className="p-3.5 text-center bg-blue-50/40 text-[#155EEF]">លេខបន្ទប់</th>
                  <th className="p-3.5 bg-blue-50/40 text-[#155EEF]">ថ្ងៃខែឆ្នាំកំណើត</th>
                  <th className="p-3.5 text-center bg-blue-50/40 text-[#155EEF]">អាយុ</th>
                  <th className="p-3.5 bg-blue-50/40 text-[#155EEF]">សំបុត្រកំណើត</th>
                  <th className="p-3.5 bg-blue-50/40 text-[#155EEF]">ទូរស័ព្ទសិស្ស</th>

                  {/* Group 2: ការសិក្សា */}
                  <th className="p-3.5 text-center bg-emerald-50/40 text-emerald-700 border-l border-slate-200">ស្ថានភាព</th>
                  <th className="p-3.5 bg-emerald-50/40 text-emerald-700">សាលាមុន</th>
                  <th className="p-3.5 text-center bg-emerald-50/40 text-emerald-700">អាហារូបករណ៍</th>
                  <th className="p-3.5 text-center bg-emerald-50/40 text-emerald-700">ក្រីក្រ (ID Poor)</th>
                  <th className="p-3.5 text-center bg-emerald-50/40 text-emerald-700">ចម្ងាយ(គ.ម)</th>

                  {/* Group 3: សុខភាព */}
                  <th className="p-3.5 text-center bg-rose-50/40 text-rose-700 border-l border-slate-200">កម្ពស់ (m)</th>
                  <th className="p-3.5 text-center bg-rose-50/40 text-rose-700">ទម្ងន់ (kg)</th>
                  <th className="p-3.5 text-center bg-rose-50/40 text-rose-700">BMI</th>
                  <th className="p-3.5 text-center bg-rose-50/40 text-rose-700">អាហារូបត្ថម្ភ</th>
                  <th className="p-3.5 text-center bg-rose-50/40 text-rose-700">ពិការភាព</th>
                  <th className="p-3.5 bg-rose-50/40 text-rose-700">បញ្ហាសុខភាព</th>

                  {/* Group 4: គ្រួសារ */}
                  <th className="p-3.5 bg-amber-50/40 text-amber-800 border-l border-slate-200">ឈ្មោះឪពុក</th>
                  <th className="p-3.5 bg-amber-50/40 text-amber-800">មុខរបរឪពុក</th>
                  <th className="p-3.5 bg-amber-50/40 text-amber-800">ទូរស័ព្ទឪពុក</th>
                  <th className="p-3.5 bg-amber-50/40 text-amber-800">ឈ្មោះម្តាយ</th>
                  <th className="p-3.5 bg-amber-50/40 text-amber-800">មុខរបរម្តាយ</th>
                  <th className="p-3.5 bg-amber-50/40 text-amber-800">ទូរស័ព្ទម្តាយ</th>
                  <th className="p-3.5 bg-amber-50/40 text-amber-800">អាណាព្យាបាល</th>
                  <th className="p-3.5 bg-amber-50/40 text-amber-800">ទូរស័ព្ទអាណាព្យាបាល</th>
                  <th className="p-3.5 text-center bg-amber-50/40 text-amber-800">បងប្អូន</th>
                  <th className="p-3.5 text-center bg-amber-50/40 text-amber-800">ចំណូល ($)</th>

                  {/* Group 5: ទីលំនៅ */}
                  <th className="p-3.5 bg-purple-50/40 text-purple-700 border-l border-slate-200">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                  <th className="p-3.5 text-center bg-purple-50/40 text-purple-700">ចំណាកស្រុក</th>
                  <th className="p-3.5 bg-purple-50/40 text-purple-700">ជម្រក</th>
                  <th className="p-3.5 text-center bg-purple-50/40 text-purple-700">ស្ថានភាពចុងក្រោយ</th>
                </>
              )}

              {activeTableView === 1 && (
                <>
                  {renderSortHeader('ភេទ', 'gender', 'center', 'w-20')}
                  {renderSortHeader('លេខតុ', 'desk_number', 'center', 'w-24')}
                  {renderSortHeader('លេខបន្ទប់', 'room_number', 'center', 'w-28')}
                  {renderSortHeader('ថ្ងៃខែឆ្នាំកំណើត', 'date_of_birth', 'left', 'w-36')}
                  {renderSortHeader('អាយុ', 'age', 'center', 'w-20')}
                  <th className="p-3.5 w-32">សំបុត្រកំណើត</th>
                  <th className="p-3.5 w-36">ទូរស័ព្ទសិស្ស</th>
                </>
              )}

              {activeTableView === 2 && (
                <>
                  {renderSortHeader('ស្ថានភាព', 'status', 'center', 'w-28')}
                  <th className="p-3.5 w-44">សាលាមុន</th>
                  {renderSortHeader('អាហារូបករណ៍', 'scholarship', 'center', 'w-28')}
                  {renderSortHeader('ID Poor', 'id_poor', 'center', 'w-32')}
                  {renderSortHeader('ចម្ងាយ(គ.ម)', 'distance_km', 'center', 'w-28')}
                </>
              )}

              {activeTableView === 3 && (
                <>
                  {renderSortHeader('កម្ពស់ (m)', 'height_m', 'center', 'w-28')}
                  {renderSortHeader('ទម្ងន់ (kg)', 'weight_kg', 'center', 'w-28')}
                  <th className="p-3.5 text-center w-24">BMI</th>
                  <th className="p-3.5 text-center w-32">អាហារូបត្ថម្ភ</th>
                  {renderSortHeader('ពិការភាព', 'disability', 'center', 'w-32')}
                  <th className="p-3.5 w-48">បញ្ហាសុខភាព</th>
                </>
              )}

              {activeTableView === 4 && (
                <>
                  <th className="p-3.5 w-44">ឈ្មោះឪពុក</th>
                  <th className="p-3.5 w-36">មុខរបរឪពុក</th>
                  <th className="p-3.5 w-36">ទូរស័ព្ទឪពុក</th>
                  <th className="p-3.5 w-44">ឈ្មោះម្តាយ</th>
                  <th className="p-3.5 w-36">មុខរបរម្តាយ</th>
                  <th className="p-3.5 w-36">ទូរស័ព្ទម្តាយ</th>
                  <th className="p-3.5 w-44">អាណាព្យាបាល</th>
                  <th className="p-3.5 w-36">ទូរស័ព្ទអាណាព្យាបាល</th>
                  {renderSortHeader('បងប្អូន', 'siblings_count', 'center', 'w-24')}
                  {renderSortHeader('ចំណូល/ខែ ($)', 'income', 'center', 'w-32')}
                </>
              )}

              {activeTableView === 5 && (
                <>
                  <th className="p-3.5 min-w-[200px]">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                  {renderSortHeader('ចំណាកស្រុក', 'migrant_status', 'center', 'w-32')}
                  <th className="p-3.5 w-36">ជម្រក</th>
                  {renderSortHeader('ស្ថានភាពចុងក្រោយ', 'current_status', 'center', 'w-32')}
                </>
              )}

              <th className="p-3.5 text-right sticky right-0 bg-slate-50 z-20 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                សកម្មភាព
              </th>
            </tr>
          </thead>
          <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
            {filteredStudents.map((std, index) => {
              const completeness = calculateProfileCompleteness(std);
              const isRowModified = !!draftUpdates[std.id] && Object.keys(draftUpdates[std.id]).length > 0;

              return (
                <tr 
                  key={std.id} 
                  className={`transition-colors ${
                    isRowModified 
                      ? 'bg-amber-50/40' 
                      : selectedIds.includes(std.id) 
                      ? 'bg-blue-50/50' 
                      : index % 2 === 0 
                      ? 'bg-white hover:bg-slate-50/80' 
                      : 'bg-slate-50/30 hover:bg-slate-50/80'
                  }`}
                >
                  {/* Sticky Column 1: Checkbox & Index */}
                  <td className="p-3.5 text-center sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_#e2e8f0]">
                    <div className="flex items-center justify-center gap-1.5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-[#155EEF] cursor-pointer" 
                        checked={selectedIds.includes(std.id)} 
                        onChange={() => handleSelect(std.id)} 
                      />
                      <span className="text-[10px] text-slate-400 font-mono w-4 text-right">{index + 1}</span>
                    </div>
                  </td>

                  {/* Sticky Column 2: Student ID */}
                  <td className="p-3.5 font-mono text-slate-500 sticky left-12 z-10 bg-inherit shadow-[1px_0_0_0_#e2e8f0]">
                    {std.student_id_number || '-'}
                  </td>

                  {/* Sticky Column 3: Full Name */}
                  <td className="p-3.5 sticky left-40 z-10 bg-inherit shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-black whitespace-nowrap">{std.full_name}</span>
                      {std.risk_level === 'high' && <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded font-bold">ហានិភ័យ</span>}
                      {completeness < 100 && (
                        <div className="group relative flex items-center cursor-help">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-[10px] py-1 px-2 rounded z-40">
                            ខ្វះព័ត៌មានលម្អិត ({completeness}%)
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* ================= Master Full View Columns ================= */}
                  {activeTableView === 0 && (
                    <>
                      {/* Group 1: Basic */}
                      <td className="p-2.5 text-center border-l border-slate-200">
                        {renderEditableCell(std, index, 'gender', 'select', [{ label: 'ប្រុស', value: 'M' }, { label: 'ស្រី', value: 'F' }])}
                      </td>
                      <td className="p-2.5 text-center w-20">
                        {renderEditableCell(std, index, 'desk_number', 'text', undefined, 'A-01')}
                      </td>
                      <td className="p-2.5 text-center w-24">
                        {renderEditableCell(std, index, 'room_number', 'text', undefined, 'បន្ទប់ ១')}
                      </td>
                      <td className="p-2.5 w-32">
                        {renderEditableCell(std, index, 'date_of_birth', 'date')}
                      </td>
                      <td className="p-2.5 text-center w-16 text-slate-500">
                        {std.age || '-'}
                      </td>
                      <td className="p-2.5 w-28">
                        {renderEditableCell(std, index, 'birth_cert_no', 'text', undefined, 'សំបុត្រកំណើត')}
                      </td>
                      <td className="p-2.5 w-32 font-mono">
                        {renderEditableCell(std, index, 'student_phone', 'text', undefined, '012...')}
                      </td>

                      {/* Group 2: Academic */}
                      <td className="p-2.5 text-center border-l border-slate-200 w-28">
                        {renderEditableCell(std, index, 'status', 'select', [{ label: 'ថ្មី', value: 'new' }, { label: 'ត្រួតថ្នាក់', value: 'repeater' }, { label: 'ផ្ទេរចូល', value: 'transfer' }])}
                      </td>
                      <td className="p-2.5 w-36">
                        {renderEditableCell(std, index, 'prev_school', 'text', undefined, 'សាលាមុន')}
                      </td>
                      <td className="p-2.5 text-center w-24">
                        {renderEditableCell(std, index, 'scholarship', 'select', [{ label: 'គ្មាន', value: 'no' }, { label: 'មាន', value: 'yes' }])}
                      </td>
                      <td className="p-2.5 text-center w-28">
                        {renderEditableCell(std, index, 'id_poor', 'select', [{ label: 'គ្មាន', value: 'none' }, { label: 'កម្រិត ១', value: 'level_1' }, { label: 'កម្រិត ២', value: 'level_2' }])}
                      </td>
                      <td className="p-2.5 text-center w-20">
                        {renderEditableCell(std, index, 'distance_km', 'number', undefined, '0')}
                      </td>

                      {/* Group 3: Health */}
                      <td className="p-2.5 text-center border-l border-slate-200 w-20">
                        {renderEditableCell(std, index, 'height_m', 'number', undefined, '1.55')}
                      </td>
                      <td className="p-2.5 text-center w-20">
                        {renderEditableCell(std, index, 'weight_kg', 'number', undefined, '45')}
                      </td>
                      <td className="p-2.5 text-center w-16 font-mono text-slate-600">
                        {getCellValue(std, 'bmi') || std.bmi || '-'}
                      </td>
                      <td className="p-2.5 text-center w-24">
                        {(getCellValue(std, 'nutrition_status') || std.nutrition_status) ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            (getCellValue(std, 'nutrition_status') || std.nutrition_status) === 'ធម្មតា' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {getCellValue(std, 'nutrition_status') || std.nutrition_status}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center w-24">
                        {renderEditableCell(std, index, 'disability', 'select', [{ label: 'គ្មាន', value: 'none' }, { label: 'ស្រាល', value: 'mild' }, { label: 'ធ្ងន់', value: 'severe' }])}
                      </td>
                      <td className="p-2.5 w-36">
                        {renderEditableCell(std, index, 'health_issues', 'text', undefined, 'បញ្ហាសុខភាព')}
                      </td>

                      {/* Group 4: Family */}
                      <td className="p-2.5 border-l border-slate-200 w-32">
                        {renderEditableCell(std, index, 'father_name', 'text', undefined, 'ឪពុក')}
                      </td>
                      <td className="p-2.5 w-28">
                        {renderEditableCell(std, index, 'father_job', 'text', undefined, 'មុខរបរ')}
                      </td>
                      <td className="p-2.5 w-32 font-mono">
                        {renderEditableCell(std, index, 'father_phone', 'text', undefined, '012...')}
                      </td>
                      <td className="p-2.5 w-32">
                        {renderEditableCell(std, index, 'mother_name', 'text', undefined, 'ម្តាយ')}
                      </td>
                      <td className="p-2.5 w-28">
                        {renderEditableCell(std, index, 'mother_job', 'text', undefined, 'មុខរបរ')}
                      </td>
                      <td className="p-2.5 w-32 font-mono">
                        {renderEditableCell(std, index, 'mother_phone', 'text', undefined, '097...')}
                      </td>
                      <td className="p-2.5 w-32">
                        {renderEditableCell(std, index, 'guardian_name', 'text', undefined, 'អាណាព្យាបាល')}
                      </td>
                      <td className="p-2.5 w-32 font-mono">
                        {renderEditableCell(std, index, 'guardian_phone', 'text', undefined, 'ទូរស័ព្ទ')}
                      </td>
                      <td className="p-2.5 text-center w-16">
                        {renderEditableCell(std, index, 'siblings_count', 'number', undefined, '0')}
                      </td>
                      <td className="p-2.5 text-center w-24">
                        {renderEditableCell(std, index, 'income', 'number', undefined, '100')}
                      </td>

                      {/* Group 5: Residence */}
                      <td className="p-2.5 border-l border-slate-200 min-w-[180px]">
                        {renderEditableCell(std, index, 'address', 'text', undefined, 'ភូមិ ឃុំ ស្រុក ខេត្ត')}
                      </td>
                      <td className="p-2.5 text-center w-28">
                        {renderEditableCell(std, index, 'migrant_status', 'select', [{ label: 'គ្មាន', value: 'none' }, { label: 'ឪពុកម្តាយ', value: 'parents' }, { label: 'សិស្ស', value: 'student' }])}
                      </td>
                      <td className="p-2.5 w-28">
                        {renderEditableCell(std, index, 'housing', 'text', undefined, 'ផ្ទះផ្ទាល់ខ្លួន')}
                      </td>
                      <td className="p-2.5 text-center w-28">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${std.current_status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                          {std.current_status === 'active' ? 'កំពុងរៀន' : 'បោះបង់'}
                        </span>
                      </td>
                    </>
                  )}

                  {/* ================= Tab 1: មូលដ្ឋាន ================= */}
                  {activeTableView === 1 && (
                    <>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'gender', 'select', [{ label: 'ប្រុស', value: 'M' }, { label: 'ស្រី', value: 'F' }])}
                      </td>
                      <td className="p-3 text-center">
                        {isEditMode ? (
                          renderEditableCell(std, index, 'desk_number', 'text', undefined, 'A-01')
                        ) : (
                          <input 
                            type="text" 
                            defaultValue={std.desk_number || ''}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (std.desk_number || '')) {
                                setStudents(students.map(s => s.id === std.id ? { ...s, desk_number: val } : s));
                                await supabase.from('student_enrollments').update({ desk_number: val || null }).eq('student_id', std.id);
                              }
                            }}
                            className="w-16 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#155EEF] rounded-lg px-2 py-1 text-center text-xs font-bold font-mono outline-none transition-colors"
                            placeholder="-"
                          />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isEditMode ? (
                          renderEditableCell(std, index, 'room_number', 'text', undefined, 'បន្ទប់ ១')
                        ) : (
                          <input 
                            type="text" 
                            defaultValue={std.room_number || ''}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (std.room_number || '')) {
                                setStudents(students.map(s => s.id === std.id ? { ...s, room_number: val } : s));
                                await supabase.from('student_enrollments').update({ room_number: val || null }).eq('student_id', std.id);
                              }
                            }}
                            className="w-20 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#155EEF] rounded-lg px-2 py-1 text-center text-xs font-bold font-mono outline-none transition-colors"
                            placeholder="-"
                          />
                        )}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'date_of_birth', 'date')}
                      </td>
                      <td className="p-3 text-center text-slate-500">{std.age || '-'}</td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'birth_cert_no', 'text', undefined, 'លេខសំបុត្រ')}
                      </td>
                      <td className="p-3 font-mono">
                        {renderEditableCell(std, index, 'student_phone', 'text', undefined, '012...')}
                      </td>
                    </>
                  )}

                  {/* ================= Tab 2: ការសិក្សា ================= */}
                  {activeTableView === 2 && (
                    <>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'status', 'select', [{ label: 'ថ្មី', value: 'new' }, { label: 'ត្រួតថ្នាក់', value: 'repeater' }, { label: 'ផ្ទេរចូល', value: 'transfer' }])}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'prev_school', 'text', undefined, 'សាលាមុន')}
                      </td>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'scholarship', 'select', [{ label: 'គ្មាន', value: 'no' }, { label: 'មាន', value: 'yes' }])}
                      </td>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'id_poor', 'select', [{ label: 'គ្មាន', value: 'none' }, { label: 'កម្រិត ១', value: 'level_1' }, { label: 'កម្រិត ២', value: 'level_2' }])}
                      </td>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'distance_km', 'number', undefined, '0')}
                      </td>
                    </>
                  )}

                  {/* ================= Tab 3: សុខភាព ================= */}
                  {activeTableView === 3 && (
                    <>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'height_m', 'number', undefined, '1.55')}
                      </td>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'weight_kg', 'number', undefined, '45')}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {getCellValue(std, 'bmi') || std.bmi || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {(getCellValue(std, 'nutrition_status') || std.nutrition_status) ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            (getCellValue(std, 'nutrition_status') || std.nutrition_status) === 'ធម្មតា' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {getCellValue(std, 'nutrition_status') || std.nutrition_status}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'disability', 'select', [{ label: 'គ្មាន', value: 'none' }, { label: 'ស្រាល', value: 'mild' }, { label: 'ធ្ងន់', value: 'severe' }])}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'health_issues', 'text', undefined, 'បញ្ហាសុខភាព')}
                      </td>
                    </>
                  )}

                  {/* ================= Tab 4: គ្រួសារ ================= */}
                  {activeTableView === 4 && (
                    <>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'father_name', 'text', undefined, 'ឪពុក')}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'father_job', 'text', undefined, 'មុខរបរឪពុក')}
                      </td>
                      <td className="p-3 font-mono">
                        {renderEditableCell(std, index, 'father_phone', 'text', undefined, 'ទូរស័ព្ទឪពុក')}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'mother_name', 'text', undefined, 'ម្តាយ')}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'mother_job', 'text', undefined, 'មុខរបរម្តាយ')}
                      </td>
                      <td className="p-3 font-mono">
                        {renderEditableCell(std, index, 'mother_phone', 'text', undefined, 'ទូរស័ព្ទម្តាយ')}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'guardian_name', 'text', undefined, 'អាណាព្យាបាល')}
                      </td>
                      <td className="p-3 font-mono">
                        {renderEditableCell(std, index, 'guardian_phone', 'text', undefined, 'ទូរស័ព្ទអាណាព្យាបាល')}
                      </td>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'siblings_count', 'number', undefined, '0')}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-600">
                        {renderEditableCell(std, index, 'income', 'number', undefined, '100')}
                      </td>
                    </>
                  )}

                  {/* ================= Tab 5: ទីលំនៅ ================= */}
                  {activeTableView === 5 && (
                    <>
                      <td className="p-3 min-w-[200px]">
                        {renderEditableCell(std, index, 'address', 'text', undefined, 'ភូមិ ឃុំ ស្រុក ខេត្ត')}
                      </td>
                      <td className="p-3 text-center">
                        {renderEditableCell(std, index, 'migrant_status', 'select', [{ label: 'គ្មាន', value: 'none' }, { label: 'ឪពុកម្តាយ', value: 'parents' }, { label: 'សិស្ស', value: 'student' }])}
                      </td>
                      <td className="p-3">
                        {renderEditableCell(std, index, 'housing', 'text', undefined, 'ជម្រក')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${std.current_status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                          {std.current_status === 'active' ? 'កំពុងរៀន' : 'បោះបង់'}
                        </span>
                      </td>
                    </>
                  )}

                  {/* Action Column */}
                  <td className="p-3 text-right sticky right-0 z-20 bg-inherit shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/students/${std.id}`} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="មើលប្រវត្តិរូបពេញ">
                        <UserSquare2 className="w-4 h-4" />
                      </Link>
                      <button onClick={() => openEditModal(std)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="បើកផ្ទាំងកែប្រែ">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openStatusModal(std)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors font-bold"
                        title="ស្នើសុំផ្ទេរចេញ / បោះបង់"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div className="py-16 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
            <Layers className="w-8 h-8 text-slate-300" />
            <p>មិនមានទិន្នន័យសិស្សនៅក្នុងថ្នាក់នេះទេ</p>
          </div>
        )}
      </div>
    </div>
  );
}
