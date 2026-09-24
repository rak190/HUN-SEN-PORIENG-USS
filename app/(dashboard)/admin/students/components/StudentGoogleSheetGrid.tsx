'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, AlertCircle, CheckCircle, Trash2, Plus, Copy, RotateCcw, X, Info, Loader2 } from 'lucide-react';

export interface GridStudent {
  _id: string; // internal id for React key
  no: string;
  student_id: string;
  full_name: string;
  gender: string;
  class_name: string;
  dob: string;
  room_number: string;
  desk_number: string;
  isValid: boolean;
  errors: string[];
}

interface StudentGoogleSheetGridProps {
  onSave: (students: any[]) => void;
  onCancel: () => void;
  isSaving: boolean;
  activeClasses: { id: string; name: string }[];
}
function normalizeClassName(name: string): string {
  if (!name) return '';
  let norm = name.replace(/ថ្នាក់ទី|ថ្នាក់|\s/g, '').toUpperCase();
  const khmerNums: Record<string, string> = { '០':'0', '១':'1', '២':'2', '៣':'3', '៤':'4', '៥':'5', '៦':'6', '៧':'7', '៨':'8', '៩':'9' };
  norm = norm.replace(/[០-៩]/g, m => khmerNums[m]);
  const khmerLetters: Record<string, string> = { 'ក':'A', 'ខ':'B', 'គ':'C', 'ឃ':'D', 'ង':'E', 'ច':'F' };
  norm = norm.replace(/[ក-ច]/g, m => khmerLetters[m]);
  return norm;
}

export default function StudentGoogleSheetGrid({ onSave, onCancel, isSaving, activeClasses }: StudentGoogleSheetGridProps) {
  const [rows, setRows] = useState<GridStudent[]>(() => {
    // Initialize with 20 empty rows
    return Array.from({ length: 20 }, (_, i) => createEmptyRow((i + 1).toString()));
  });
  
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; field: keyof GridStudent } | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  function createEmptyRow(no: string = ''): GridStudent {
    return {
      _id: Math.random().toString(36).substr(2, 9),
      no,
      student_id: '',
      full_name: '',
      gender: '',
      class_name: '',
      dob: '',
      room_number: '',
      desk_number: '',
      isValid: false,
      errors: []
    };
  }

  // Normalization & Validation
  const validateAndNormalize = useCallback((row: GridStudent): GridStudent => {
    const errors: string[] = [];
    
    // Normalize gender
    let normalizedGender = row.gender.trim();
    const gLower = normalizedGender.toLowerCase();
    if (['m', 'male', 'ប្រុស', 'ប'].includes(gLower)) normalizedGender = 'ប្រុស';
    else if (['f', 'female', 'ស្រី', 'ស'].includes(gLower)) normalizedGender = 'ស្រី';
    
    // Check required (Only validate if at least one field is partially filled to avoid red empty rows)
    const hasData = row.student_id || row.full_name || row.gender || row.class_name || row.dob || row.room_number || row.desk_number;
    
    if (hasData) {
      if (!row.student_id.trim()) errors.push('អត្តលេខមិនអាចទទេ');
      if (!row.full_name.trim()) errors.push('ឈ្មោះមិនអាចទទេ');
      
      if (!['ប្រុស', 'ស្រី'].includes(normalizedGender)) {
        errors.push('ភេទមិនត្រឹមត្រូវ (ប្រុស/ស្រី)');
      }
      
      if (row.class_name.trim()) {
        const normalizedInput = normalizeClassName(row.class_name);
        const matchedClass = activeClasses.find(c => normalizeClassName(c.name) === normalizedInput);
        if (!matchedClass) errors.push('រកមិនឃើញថ្នាក់នេះទេ');
      } else {
        errors.push('ថ្នាក់មិនអាចទទេ');
      }
    }
    
    // Convert Dates (DD/MM/YYYY to YYYY-MM-DD roughly)
    let parsedDob = row.dob.trim();
    if (parsedDob) {
      // Basic match for DD/MM/YYYY or DD-MM-YYYY
      const dateMatch = parsedDob.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dateMatch) {
        const [_, d, m, y] = dateMatch;
        parsedDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedDob)) {
        errors.push('ទម្រង់ថ្ងៃខែមិនត្រឹមត្រូវ (ឧ. 2010-02-01 ឬ 01/02/2010)');
      }
    }

    return {
      ...row,
      gender: normalizedGender,
      dob: parsedDob,
      class_name: row.class_name.trim(),
      isValid: hasData ? errors.length === 0 : true,
      errors: hasData ? errors : []
    };
  }, [activeClasses]);

  // Run validation when data changes
  useEffect(() => {
    setRows(prev => {
      let isChanged = false;
      
      // Check for duplicates in ID
      const idCounts: Record<string, number> = {};
      prev.forEach(r => {
        const id = r.student_id.trim();
        if (id) idCounts[id] = (idCounts[id] || 0) + 1;
      });

      const nextRows = prev.map(row => {
        const vRow = validateAndNormalize(row);
        const id = vRow.student_id.trim();
        if (id && idCounts[id] > 1 && vRow.errors.length === 0) {
          vRow.errors.push('អត្តលេខស្ទួនគ្នាក្នុងតារាង');
          vRow.isValid = false;
        }
        
        // Deep compare to avoid unnecessary re-renders
        if (vRow.gender !== row.gender || vRow.dob !== row.dob || vRow.class_name !== row.class_name || vRow.isValid !== row.isValid || vRow.errors.join() !== row.errors.join()) {
          isChanged = true;
        }
        return vRow;
      });
      
      return isChanged ? nextRows : prev;
    });
  }, [rows, validateAndNormalize]);

  const updateCell = (rowIndex: number, field: keyof GridStudent, value: string) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  };

  const addRows = (count: number = 5) => {
    setRows(prev => {
      const next = [...prev];
      const startNo = prev.length + 1;
      for (let i = 0; i < count; i++) {
        next.push(createEmptyRow((startNo + i).toString()));
      }
      return next;
    });
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យទាំងអស់មែនទេ?')) {
      setRows(Array.from({ length: 20 }, (_, i) => createEmptyRow((i + 1).toString())));
    }
  };

  const handlePaste = (e: React.ClipboardEvent, startRowIndex: number, startField: keyof GridStudent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    // Parse spreadsheet data: split by newline (rows) and tab (columns)
    const pasteRows = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Define column order matching the grid
    const colOrder: (keyof GridStudent)[] = ['no', 'student_id', 'full_name', 'gender', 'class_name', 'dob', 'room_number', 'desk_number'];
    const startColIndex = colOrder.indexOf(startField);
    
    if (startColIndex === -1) return;

    setRows(prev => {
      const next = [...prev];
      
      for (let i = 0; i < pasteRows.length; i++) {
        const targetRowIndex = startRowIndex + i;
        
        // Add more rows if we pasted beyond current capacity
        if (targetRowIndex >= next.length) {
          next.push(createEmptyRow((next.length + 1).toString()));
        }
        
        const pasteCols = pasteRows[i].split('\t');
        
        // Single column paste logic: if they copied 1 column, paste it into startField
        if (pasteCols.length === 1) {
             next[targetRowIndex] = { ...next[targetRowIndex], [startField]: pasteCols[0].trim() };
        } else {
             // Multi-column paste
             for (let j = 0; j < pasteCols.length; j++) {
               const targetColIndex = startColIndex + j;
               if (targetColIndex < colOrder.length) {
                 const field = colOrder[targetColIndex];
                 if (field !== 'no' && field !== '_id' && field !== 'isValid' && field !== 'errors') {
                   next[targetRowIndex] = { ...next[targetRowIndex], [field]: pasteCols[j].trim() };
                 }
               }
             }
        }
      }
      return next;
    });
  };

  const handleSave = () => {
    // Filter out completely empty rows
    const dataToSave = rows.filter(r => r.student_id || r.full_name || r.gender || r.class_name || r.dob || r.room_number || r.desk_number);
    
    if (dataToSave.length === 0) {
      alert('សូមបញ្ចូលទិន្នន័យយ៉ាងហោចណាស់១ជួរ!');
      return;
    }
    
    const invalidRows = dataToSave.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
      alert(`មានទិន្នន័យមិនត្រឹមត្រូវចំនួន ${invalidRows.length} ជួរ។ សូមកែតម្រូវសិន (ជួរពណ៌ក្រហម)។`);
      return;
    }
    
    // Map to required payload format
    const payload = dataToSave.map(r => {
      const normalizedInput = normalizeClassName(r.class_name);
      const matchedClass = activeClasses.find(c => normalizeClassName(c.name) === normalizedInput);
      return {
        student_id_number: r.student_id,
        full_name: r.full_name,
        gender: r.gender,
        class_id: matchedClass?.id,
        dob: r.dob,
        room_number: r.room_number,
        desk_number: r.desk_number,
        status: 'new'
      };
    });
    
    onSave(payload);
  };

  const validCount = rows.filter(r => r.isValid && (r.student_id || r.full_name)).length;
  const errorCount = rows.filter(r => !r.isValid && r.errors.length > 0).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px] animate-fadeIn relative">
      
      {isSaving && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <Loader2 className="w-8 h-8 animate-spin text-[#155EEF]" />
            <span className="font-kantumruy text-sm font-bold text-slate-800">
              កំពុងដំណើរការទិន្នន័យសិស្ស ({rows.filter(r => r.isValid && (r.student_id || r.full_name)).length} នាក់)...
            </span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
            <span className="text-slate-500">សរុប:</span>
            <span>{rows.filter(r => r.student_id || r.full_name).length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700 shadow-sm">
            <CheckCircle className="w-4 h-4" />
            <span>ត្រឹមត្រូវ: {validCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-sm font-bold text-rose-700 shadow-sm">
            <AlertCircle className="w-4 h-4" />
            <span>មានបញ្ហា: {errorCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button 
            onClick={clearAll}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 font-bold rounded-xl text-sm transition-colors hover:bg-slate-100 flex items-center gap-2 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> ជម្រះទាំងអស់
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || errorCount > 0 || validCount === 0}
            className="px-6 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="animate-spin text-lg leading-none">⟳</span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'កំពុងរក្សាទុក...' : 'បញ្ជូលទិន្នន័យ (Import)'}
          </button>
        </div>
      </div>
      
      {/* Tips */}
      <div className="bg-blue-50/50 p-2 px-4 border-b border-blue-100 flex items-start gap-2 text-xs font-semibold text-blue-800">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p>
          អ្នកអាច Copy ទិន្នន័យពី Excel ឬ Google Sheets មក Paste បញ្ចូលក្នុងតារាងនេះបានដោយផ្ទាល់។ 
          អ្នកអាច Paste មួយជួរឈរ (Column) ឬ ច្រើនជួរឈរក្នុងពេលតែមួយ។ <span className="font-bold underline text-blue-700">ថ្នាក់ត្រូវតែសរសេរឲ្យត្រូវនឹងឈ្មោះថ្នាក់ដែលមានស្រាប់ក្នុងប្រព័ន្ធ (ឧ. 10A, 7B)</span>។
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-white p-2" ref={gridRef}>
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="w-12 p-2 border border-slate-200 text-center text-xs font-black text-slate-600">ល.រ</th>
              <th className="w-32 p-2 border border-slate-200 text-xs font-black text-slate-600">អត្តលេខ*</th>
              <th className="p-2 border border-slate-200 text-xs font-black text-slate-600">គោត្តនាម និង នាម*</th>
              <th className="w-24 p-2 border border-slate-200 text-center text-xs font-black text-slate-600">ភេទ*</th>
              <th className="w-32 p-2 border border-slate-200 text-center text-xs font-black text-slate-600">ថ្នាក់*</th>
              <th className="w-40 p-2 border border-slate-200 text-center text-xs font-black text-slate-600">ថ្ងៃខែឆ្នាំកំណើត</th>
              <th className="w-24 p-2 border border-slate-200 text-center text-xs font-black text-slate-600">លេខបន្ទប់</th>
              <th className="w-24 p-2 border border-slate-200 text-center text-xs font-black text-slate-600">លេខតុ</th>
              <th className="w-12 p-2 border border-slate-200 text-center text-xs font-black text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const hasData = row.student_id || row.full_name || row.gender || row.class_name || row.dob || row.room_number || row.desk_number;
              const isInvalid = hasData && !row.isValid;
              
              return (
                <tr key={row._id} className={`group hover:bg-slate-50 transition-colors ${isInvalid ? 'bg-rose-50/50' : ''}`}>
                  <td className={`p-0 border border-slate-200 text-center text-xs font-bold text-slate-400 bg-slate-50 group-hover:bg-slate-100 transition-colors ${isInvalid ? 'border-rose-200 text-rose-500' : ''}`}>
                    {rowIndex + 1}
                  </td>
                  
                  {['student_id', 'full_name', 'gender', 'class_name', 'dob', 'room_number', 'desk_number'].map((field) => {
                    const typedField = field as keyof GridStudent;
                    let hasErrorForField = false;
                    let errorTooltip = '';
                    
                    if (isInvalid) {
                      if (field === 'student_id' && row.errors.some(e => e.includes('អត្តលេខ'))) {
                        hasErrorForField = true; errorTooltip = row.errors.find(e => e.includes('អត្តលេខ')) || '';
                      }
                      if (field === 'full_name' && row.errors.some(e => e.includes('ឈ្មោះ'))) {
                        hasErrorForField = true; errorTooltip = row.errors.find(e => e.includes('ឈ្មោះ')) || '';
                      }
                      if (field === 'gender' && row.errors.some(e => e.includes('ភេទ'))) {
                        hasErrorForField = true; errorTooltip = row.errors.find(e => e.includes('ភេទ')) || '';
                      }
                      if (field === 'class_name' && row.errors.some(e => e.includes('ថ្នាក់'))) {
                        hasErrorForField = true; errorTooltip = row.errors.find(e => e.includes('ថ្នាក់')) || '';
                      }
                      if (field === 'dob' && row.errors.some(e => e.includes('ថ្ងៃខែ'))) {
                        hasErrorForField = true; errorTooltip = row.errors.find(e => e.includes('ថ្ងៃខែ')) || '';
                      }
                    }
                    
                    return (
                      <td key={field} className="p-0 border border-slate-200 relative">
                        <input
                          type="text"
                          value={row[typedField] as string}
                          onChange={(e) => updateCell(rowIndex, typedField, e.target.value)}
                          onPaste={(e) => handlePaste(e, rowIndex, typedField)}
                          onFocus={() => setFocusedCell({ rowIndex, field: typedField })}
                          className={`w-full h-full p-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#155EEF] bg-transparent ${hasErrorForField ? 'bg-rose-100/50 text-rose-700 placeholder-rose-300' : 'text-slate-800'}`}
                          title={errorTooltip}
                          placeholder={field === 'dob' ? 'YYYY-MM-DD' : ''}
                        />
                        {hasErrorForField && (
                           <div className="absolute top-1/2 right-2 -translate-y-1/2 pointer-events-none text-rose-500" title={errorTooltip}>
                              <AlertCircle className="w-3.5 h-3.5" />
                           </div>
                        )}
                      </td>
                    );
                  })}
                  
                  <td className="p-0 border border-slate-200 text-center bg-slate-50">
                    <button 
                      onClick={() => removeRow(rowIndex)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="លុបជួរ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="p-4 flex justify-center">
          <button 
            onClick={() => addRows(10)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-sm transition-colors border border-slate-200 shadow-sm"
          >
            <Plus className="w-4 h-4" /> បន្ថែម 10 ជួរទៀត
          </button>
        </div>
      </div>
    </div>
  );
}
