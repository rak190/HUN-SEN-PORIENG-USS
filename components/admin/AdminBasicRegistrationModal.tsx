'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth-context';
import { Table as TableIcon, X, Check, Save, Loader2 } from 'lucide-react';

interface AdminBasicRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStudents: any[]) => void;
  filterOptions: {
    classes: { id: string; name: string }[];
  };
}

export default function AdminBasicRegistrationModal({ isOpen, onClose, onSuccess, filterOptions }: AdminBasicRegistrationModalProps) {
  const { isDemoMode, activeAcademicYear } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Since Admin operates globally, they must select a target class for this batch
  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateEmptyRow = () => ({
    student_id_number: '',
    full_name: '',
    gender: 'M',
    desk_number: '',
    room_number: ''
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number, startField: string) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    const rows = pasteData.split('\n').filter(r => r.trim() !== '');
    if (rows.length === 0) return;

    const columns = ['no', 'student_id_number', 'full_name', 'gender', 'desk_number', 'room_number'];
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
            // Handle Khmer gender conversions on paste if needed
            if (colName === 'gender') {
                const isFemale = ['f', 'ស្រី', 'ស្ត្រី', 'female'].includes(val.toLowerCase());
                val = isFemale ? 'F' : 'M';
            }
            newData[targetRowIdx][colName] = val;
          }
        }
      });
    });

    while (newData.length < startIndex + rows.length + 5) {
      newData.push(generateEmptyRow());
    }

    setGridData(newData);
  };

  const handleSave = async () => {
    if (!selectedClass) {
        setErrorMsg('សូមជ្រើសរើសថ្នាក់ជាមុនសិន!');
        return;
    }

    const validData = gridData.filter(row => row.student_id_number.trim() !== '' && row.full_name.trim() !== '');
    
    if (validData.length === 0) {
      setErrorMsg('សូមបញ្ចូលអត្តលេខ និងឈ្មោះសិស្សយ៉ាងហោចណាស់មួយជួរ។');
      return;
    }

    // Check for duplicates within the grid itself
    const ids = validData.map(r => r.student_id_number.trim());
    if (new Set(ids).size !== ids.length) {
        setErrorMsg('មានអត្តលេខជាន់គ្នានៅក្នុងតារាង! សូមពិនិត្យឡើងវិញ។');
        return;
    }

    if (!activeAcademicYear?.id) {
      setErrorMsg('រកមិនឃើញឆ្នាំសិក្សា។ សូមផ្ទុកទំព័រម្តងទៀត។');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const payload = validData.map(s => {
      const isFemale = ['f', 'ស្រី', 'ស្ត្រី'].includes((s.gender || '').toLowerCase().trim());
      
      return {
        class_id: selectedClass, 
        status: 'new',
        gender: isFemale ? 'F' : 'M',
        student_id_number: s.student_id_number.trim(),
        full_name: s.full_name.trim(),
        desk_number: s.desk_number?.trim() || null,
        room_number: s.room_number?.trim() || null,
      };
    });

    try {
      const { adminBasicRegisterAction } = await import('@/app/(dashboard)/admin/students/actions');
      const res = await adminBasicRegisterAction({
        records: payload,
        academic_year_id: activeAcademicYear.id
      });
      
      if (!res.success) {
        throw new Error(res.error || 'បរាជ័យក្នុងការរក្សាទុកបញ្ជីឈ្មោះសិស្ស។');
      }

      onSuccess(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការរក្សាទុកបញ្ជីឈ្មោះសិស្ស។');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 lg:p-10 animate-overlayFade" onClick={onClose}>
      <div className="w-full h-full max-w-5xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col relative animate-modalScale" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">បញ្ចូលបញ្ជីឈ្មោះសិស្សមូលដ្ឋាន (Official Roster)</h2>
              <p className="text-xs font-bold text-slate-500">Fast Entry: អាច Copy-Paste ពី Excel មកកាន់តារាងនេះបានដោយផ្ទាល់។</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-500"
            >
                <option value="">-- ជ្រើសរើសថ្នាក់ --</option>
                {filterOptions.classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Spreadsheet Grid */}
        <div className="flex-1 overflow-auto bg-[#F8FAFC] relative">
          <table ref={tableRef} className="w-full text-sm text-left border-collapse bg-white">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm font-black text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 border border-slate-200 w-12 text-center text-slate-400">ល.រ</th>
                <th className="px-4 py-3 border border-slate-200 w-32 text-blue-600">អត្តលេខ*</th>
                <th className="px-4 py-3 border border-slate-200 w-full text-blue-600">គោត្តនាម និងនាម*</th>
                <th className="px-4 py-3 border border-slate-200 w-24 text-center">ភេទ*</th>
                <th className="px-4 py-3 border border-slate-200 w-24 text-center">លេខតុ</th>
                <th className="px-4 py-3 border border-slate-200 w-24 text-center">បន្ទប់</th>
              </tr>
            </thead>
            <tbody>
              {gridData.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="border border-slate-200 text-center font-bold text-slate-400 bg-slate-50 group-hover:bg-blue-50/50">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      type="text"
                      className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 uppercase"
                      value={row.student_id_number}
                      onChange={(e) => handleChange(idx, 'student_id_number', e.target.value)}
                      onPaste={(e) => handlePaste(e, idx, 'student_id_number')}
                      data-row={idx} data-col="student_id_number"
                      placeholder="e.g. S001"
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      type="text"
                      className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      value={row.full_name}
                      onChange={(e) => handleChange(idx, 'full_name', e.target.value)}
                      onPaste={(e) => handlePaste(e, idx, 'full_name')}
                      data-row={idx} data-col="full_name"
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <select
                      className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 font-bold text-center"
                      value={row.gender}
                      onChange={(e) => handleChange(idx, 'gender', e.target.value)}
                      data-row={idx} data-col="gender"
                    >
                      <option value="M">ប្រុស (M)</option>
                      <option value="F">ស្រី (F)</option>
                    </select>
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      type="text"
                      className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 text-center"
                      value={row.desk_number}
                      onChange={(e) => handleChange(idx, 'desk_number', e.target.value)}
                      onPaste={(e) => handlePaste(e, idx, 'desk_number')}
                      data-row={idx} data-col="desk_number"
                      placeholder="ស្រេចចិត្ត"
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      type="text"
                      className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 text-center"
                      value={row.room_number}
                      onChange={(e) => handleChange(idx, 'room_number', e.target.value)}
                      onPaste={(e) => handlePaste(e, idx, 'room_number')}
                      data-row={idx} data-col="room_number"
                      placeholder="ស្រេចចិត្ត"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex-1">
            {errorMsg && (
              <div className="text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-xl flex items-center gap-2 animate-shake">
                <X className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            {!errorMsg && (
                <div className="text-slate-500 text-sm font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    ព័ត៌មានមូលដ្ឋាននេះនឹងក្លាយជាទិន្នន័យគោល (Master Data) ជាផ្លូវការ។
                </div>
            )}
          </div>
          
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> កំពុងរក្សាទុក...</>
            ) : (
              <><Save className="w-5 h-5" /> បញ្ជាក់ការចុះឈ្មោះបញ្ជី</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
