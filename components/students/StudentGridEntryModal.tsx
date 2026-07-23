'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const tableRef = useRef<HTMLTableElement>(null);

  // We start with 5 empty rows
  const generateEmptyRow = () => ({
    student_id_number: '',
    full_name: '',
    gender: 'M',
    parent_phone: '',
  });

  const [gridData, setGridData] = useState<any[]>(Array(10).fill(null).map(generateEmptyRow));

  if (!isOpen) return null;

  const handleChange = (index: number, field: string, value: string) => {
    const newData = [...gridData];
    newData[index][field] = value;
    
    // Automatically add a new row if we're typing in the very last row
    if (index === gridData.length - 1 && value.trim() !== '') {
      newData.push(generateEmptyRow());
    }
    
    setGridData(newData);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move down one row
      const nextRow = tableRef.current?.querySelector(`input[data-row="${index + 1}"][data-col="${field}"]`) as HTMLInputElement;
      if (nextRow) nextRow.focus();
    }
  };

  const handleSave = async () => {
    // Filter out completely empty rows
    const validData = gridData.filter(row => row.student_id_number.trim() !== '' || row.full_name.trim() !== '');
    
    if (validData.length === 0) {
      setErrorMsg('សូមបញ្ចូលទិន្នន័យយ៉ាងហោចណាស់មួយជួរ។');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const payload = validData.map(s => ({
      ...s,
      class_id: activeClass?.id || 'demo-class',
      is_active: true,
      student_id_number: s.student_id_number.trim() || `ID-${Math.floor(Math.random() * 10000)}`,
      full_name: s.full_name.trim() || 'គ្មានឈ្មោះ',
    }));

    if (isDemoMode || !activeClass) {
      setTimeout(() => {
        onSuccess(payload.map((s, i) => ({ ...s, id: `grid-${Date.now()}-${i}` })));
        setLoading(false);
        onClose();
      }, 500);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('students').insert(payload).select();
      if (error) throw error;

      onSuccess(data || payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការរក្សាទុក។');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 lg:p-10 animate-overlayFade">
      <div className="w-full h-full max-w-7xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col relative animate-modalScale">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">បញ្ចូលតាមតារាង</h2>
              <p className="text-xs font-bold text-slate-500">វាយបញ្ចូលទិន្នន័យបានលឿនដូច Excel។ ចុច <span className="bg-slate-200 px-1.5 py-0.5 rounded">Enter</span> ដើម្បីចុះបន្ទាត់។</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Spreadsheet Grid */}
        <div className="flex-1 overflow-auto bg-[#F8FAFC] relative">
          <table ref={tableRef} className="w-full text-sm text-left border-collapse bg-white">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm font-black text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 border border-slate-200 w-12 text-center text-slate-400">ល.រ</th>
                <th className="px-4 py-3 border border-slate-200 w-48">អត្តលេខ*</th>
                <th className="px-4 py-3 border border-slate-200">ឈ្មោះពេញ*</th>
                <th className="px-4 py-3 border border-slate-200 w-32">ភេទ (M/F)*</th>
                <th className="px-4 py-3 border border-slate-200 w-48">លេខទូរសព្ទ</th>
              </tr>
            </thead>
            <tbody>
              {gridData.map((row, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="border border-slate-200 text-center font-bold text-slate-400 bg-slate-50 group-hover:bg-indigo-50/50">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="student_id_number"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent font-mono text-sm"
                      value={row.student_id_number}
                      onChange={(e) => handleChange(idx, 'student_id_number', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'student_id_number')}
                      placeholder={idx === 0 ? "ឧ. ID-001" : ""}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="full_name"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent font-bold text-sm"
                      value={row.full_name}
                      onChange={(e) => handleChange(idx, 'full_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'full_name')}
                      placeholder={idx === 0 ? "ឈ្មោះសិស្ស" : ""}
                    />
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <select
                      data-row={idx}
                      data-col="gender"
                      className="w-full h-10 px-2 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent font-bold text-sm cursor-pointer"
                      value={row.gender}
                      onChange={(e) => handleChange(idx, 'gender', e.target.value)}
                    >
                      <option value="M">ប្រុស</option>
                      <option value="F">ស្រី</option>
                    </select>
                  </td>
                  <td className="border border-slate-200 p-0 relative">
                    <input
                      data-row={idx}
                      data-col="parent_phone"
                      type="text"
                      className="w-full h-10 px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent font-mono text-sm"
                      value={row.parent_phone}
                      onChange={(e) => handleChange(idx, 'parent_phone', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'parent_phone')}
                      placeholder={idx === 0 ? "012345678" : ""}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button 
            onClick={() => setGridData([...gridData, generateEmptyRow()])}
            className="flex items-center gap-2 mt-4 ml-4 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">បោះបង់</button>
            <button 
              onClick={handleSave} 
              disabled={loading}
              className="px-8 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              រក្សាទុកទៅក្នុងបញ្ជី
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
