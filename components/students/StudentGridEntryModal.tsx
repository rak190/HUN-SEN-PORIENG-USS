'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Table as TableIcon, X, Check, Plus, Loader2, Save } from 'lucide-react';

interface StudentGridEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStudents: any[]) => void;
}

export default function StudentGridEntryModal({ isOpen, onClose, onSuccess }: StudentGridEntryModalProps) {
  const { activeClass, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateEmptyRow = () => ({
    student_id_number: '',
    full_name: '',
    gender: 'M',
    dob: '',
    address: '',
    father_name: '',
    father_job: '',
    father_phone: '',
    mother_name: '',
    mother_job: '',
    mother_phone: '',
  });

  const [gridData, setGridData] = useState<any[]>(Array(15).fill(null).map(generateEmptyRow));

  if (!isOpen || !mounted) return null;

  const handleChange = (index: number, field: string, value: string) => {
    const newData = [...gridData];
    newData[index][field] = value;
    
    if (index === gridData.length - 1 && value.trim() !== '') {
      newData.push(generateEmptyRow());
    }
    
    setGridData(newData);
  };

  const handleAddRow = () => {
    setGridData(prev => [...prev, generateEmptyRow()]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextRow = tableRef.current?.querySelector(`input[data-row="${index + 1}"][data-col="${field}"]`) as HTMLInputElement;
      if (nextRow) nextRow.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number, startField: string) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    const rows = pasteData.split('\n').filter(r => r.trim() !== '');
    if (rows.length === 0) return;

    const columns = [
      'no', 'student_id_number', 'full_name', 'gender', 'dob', 'address',
      'father_name', 'father_job', 'father_phone',
      'mother_name', 'mother_job', 'mother_phone'
    ];

    const startColIndex = columns.indexOf(startField);
    if (startColIndex === -1) return;

    const newData = [...gridData];

    rows.forEach((rowStr, rIdx) => {
      const cells = rowStr.split('\t');
      const targetRowIdx = startIndex + rIdx;

      if (targetRowIdx >= newData.length) {
        newData.push(generateEmptyRow());
      }

      cells.forEach((cellVal, cIdx) => {
        const targetColIdx = startColIndex + cIdx;
        if (targetColIdx < columns.length) {
          const colName = columns[targetColIdx];
          if (colName !== 'no') {
            let val = cellVal.trim();
            // Handle Excel serial dates for dob if copied from Excel without formatting
            if (colName === 'dob' && val && !isNaN(Number(val)) && Number(val) > 30000) {
               // Excel epoch is roughly Dec 30, 1899. 25569 days until Jan 1, 1970
               const dateObj = new Date((Number(val) - 25569) * 86400 * 1000);
               if (!isNaN(dateObj.getTime())) {
                 val = dateObj.toISOString().split('T')[0];
               }
            }
            newData[targetRowIdx][colName] = val;
          }
        }
      });
    });

    // Add extra empty rows at the end just in case
    while (newData.length < startIndex + rows.length + 5) {
      newData.push(generateEmptyRow());
    }

    setGridData(newData);
  };

  const handleSave = async () => {
    const validData = gridData.filter(row => row.student_id_number.trim() !== '' || row.full_name.trim() !== '');
    
    if (validData.length === 0) {
      setErrorMsg('សូមបញ្ចូលទិន្នន័យយ៉ាងហោចណាស់មួយជួរ។');
      return;
    }

    if (!activeClass?.academic_year_id) {
      setErrorMsg('រកមិនឃើញឆ្នាំសិក្សា។ សូមផ្ទុកទំព័រម្តងទៀត។');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const payload = validData.map(s => {
      // Basic formatting cleanup
      const isFemale = ['f', 'ស្រី', 'ស្ត្រី'].includes((s.gender || '').toLowerCase().trim());
      
      let dobStr = s.dob?.trim();
      // Validate dob is roughly a date if possible, else null
      if (dobStr) {
        const d = new Date(dobStr);
        if (isNaN(d.getTime())) dobStr = null;
        else dobStr = d.toISOString().split('T')[0];
      }

      return {
        class_id: activeClass?.id || 'demo-class',
        status: 'new',
        gender: isFemale ? 'F' : 'M',
        student_id_number: s.student_id_number.trim() || `ID-${Math.floor(Math.random() * 10000)}`,
        full_name: s.full_name.trim() || 'គ្មានឈ្មោះ',
        dob: dobStr || null,
        address: s.address?.trim() || null,
        father_name: s.father_name?.trim() || null,
        father_job: s.father_job?.trim() || null,
        father_phone: s.father_phone?.trim() || null,
        mother_name: s.mother_name?.trim() || null,
        mother_job: s.mother_job?.trim() || null,
        mother_phone: s.mother_phone?.trim() || null,
      };
    });

    if (isDemoMode || !activeClass) {
      setTimeout(() => {
        onSuccess(payload.map((s, i) => ({ ...s, id: `grid-${Date.now()}-${i}` })));
        setLoading(false);
        onClose();
      }, 500);
      return;
    }

    try {
      const { bulkQuickRegisterAction } = await import('@/app/(dashboard)/students/actions');
      const res = await bulkQuickRegisterAction({
        records: payload,
        academic_year_id: activeClass.academic_year_id
      });
      
      if (!res.success) {
        throw new Error(res.error || 'បរាជ័យក្នុងការរក្សាទុក។');
      }

      onSuccess(payload.map((s, i) => ({ ...s, id: `grid-${Date.now()}-${i}` })));
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការរក្សាទុក។');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 lg:p-10 animate-overlayFade" onClick={onClose}>
      <div className="w-full h-full max-w-7xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col relative animate-modalScale" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">បញ្ចូលតាមតារាង (Copy-Paste ពី Excel)</h2>
              <p className="text-xs font-bold text-slate-500">Copy ជួរពី Excel រួច Paste ចូលក្នុងក្រឡាណាមួយដើម្បីបំពេញដោយស្វ័យប្រវត្តិ។</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Spreadsheet Grid */}
        <div className="flex-1 overflow-auto bg-[#F8FAFC] relative">
          <table ref={tableRef} className="w-max text-sm text-left border-collapse bg-white">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm font-black text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 border border-slate-200 w-12 text-center text-slate-400 sticky left-0 bg-slate-100 z-20">ល.រ</th>
                <th className="px-4 py-3 border border-slate-200 w-32 sticky left-12 bg-slate-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">អត្តលេខ</th>
                <th className="px-4 py-3 border border-slate-200 w-48">គោត្តនាម និងនាម</th>
                <th className="px-4 py-3 border border-slate-200 w-24 text-center">ភេទ</th>
                <th className="px-4 py-3 border border-slate-200 w-36">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th className="px-4 py-3 border border-slate-200 w-48">ទីកន្លែងកំណើត</th>
                <th className="px-4 py-3 border border-slate-200 w-40">ឈ្មោះឪពុក</th>
                <th className="px-4 py-3 border border-slate-200 w-32">មុខរបរឪពុក</th>
                <th className="px-4 py-3 border border-slate-200 w-36">លេខទូរសព្ទឪពុក</th>
                <th className="px-4 py-3 border border-slate-200 w-40">ឈ្មោះម្តាយ</th>
                <th className="px-4 py-3 border border-slate-200 w-32">មុខរបរម្តាយ</th>
                <th className="px-4 py-3 border border-slate-200 w-36">លេខទូរសព្ទម្តាយ</th>
              </tr>
            </thead>
            <tbody>
              {gridData.map((row, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="border border-slate-200 text-center font-bold text-slate-400 bg-slate-50 group-hover:bg-indigo-50/50 sticky left-0 z-10">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-200 p-0 relative sticky left-12 bg-white group-hover:bg-indigo-50/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <input
                      data-row={idx}
                      data-col="student_id_number"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent font-mono text-sm"
                      value={row.student_id_number}
                      onChange={(e) => handleChange(idx, 'student_id_number', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'student_id_number')}
                      onPaste={(e) => handlePaste(e, idx, 'student_id_number')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="full_name"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm font-semibold text-slate-800"
                      value={row.full_name}
                      onChange={(e) => handleChange(idx, 'full_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'full_name')}
                      onPaste={(e) => handlePaste(e, idx, 'full_name')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="gender"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-center font-bold text-sm"
                      value={row.gender}
                      onChange={(e) => handleChange(idx, 'gender', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'gender')}
                      onPaste={(e) => handlePaste(e, idx, 'gender')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="dob"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm"
                      value={row.dob}
                      onChange={(e) => handleChange(idx, 'dob', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'dob')}
                      onPaste={(e) => handlePaste(e, idx, 'dob')}
                      placeholder="YYYY-MM-DD"
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="address"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm"
                      value={row.address}
                      onChange={(e) => handleChange(idx, 'address', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'address')}
                      onPaste={(e) => handlePaste(e, idx, 'address')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="father_name"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm"
                      value={row.father_name}
                      onChange={(e) => handleChange(idx, 'father_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'father_name')}
                      onPaste={(e) => handlePaste(e, idx, 'father_name')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="father_job"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm"
                      value={row.father_job}
                      onChange={(e) => handleChange(idx, 'father_job', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'father_job')}
                      onPaste={(e) => handlePaste(e, idx, 'father_job')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="father_phone"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm font-mono"
                      value={row.father_phone}
                      onChange={(e) => handleChange(idx, 'father_phone', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'father_phone')}
                      onPaste={(e) => handlePaste(e, idx, 'father_phone')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="mother_name"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm"
                      value={row.mother_name}
                      onChange={(e) => handleChange(idx, 'mother_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'mother_name')}
                      onPaste={(e) => handlePaste(e, idx, 'mother_name')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="mother_job"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm"
                      value={row.mother_job}
                      onChange={(e) => handleChange(idx, 'mother_job', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'mother_job')}
                      onPaste={(e) => handlePaste(e, idx, 'mother_job')}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="mother_phone"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent text-sm font-mono"
                      value={row.mother_phone}
                      onChange={(e) => handleChange(idx, 'mother_phone', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'mother_phone')}
                      onPaste={(e) => handlePaste(e, idx, 'mother_phone')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button Row */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <button 
            onClick={handleAddRow}
            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> បន្ថែមជួរថ្មី
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          {errorMsg ? (
            <p className="text-rose-500 font-bold text-xs">{errorMsg}</p>
          ) : (
            <p className="text-slate-500 font-bold text-xs">ទិន្នន័យទទេនឹងមិនត្រូវបានរក្សាទុកទេ។</p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">បោះបង់</button>
            <button 
              onClick={handleSave} 
              disabled={loading}
              className="px-8 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              រក្សាទុកទៅក្នុងបញ្ជី
            </button>
          </div>
        </div>
        
      </div>
    </div>,
    document.body
  );
}
