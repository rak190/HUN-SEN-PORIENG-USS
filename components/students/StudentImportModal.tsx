'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Upload, FileSpreadsheet, Check, AlertTriangle, X, Loader2, ArrowRight } from 'lucide-react';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStudents: any[]) => void;
}

export default function StudentImportModal({ isOpen, onClose, onSuccess }: StudentImportModalProps) {
  const { activeClass, isDemoMode } = useAuth();
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const supabase = createClient();

  if (!isOpen) return null;

  function handleFileChange(file: File) {
    setErrorMsg('');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          setErrorMsg('ឯកសារ Excel មិនមានទិន្នន័យទេ។');
          return;
        }

        // Map column variations to standard student format
        const students = json.map((row, idx) => {
          const idNum = row['អត្តលេខ'] || row['ID'] || row['Student ID'] || `ID-${idx + 101}`;
          const fullName = row['គោត្តនាម និងនាម'] || row['ឈ្មោះ'] || row['Full Name'] || row['Name'] || `សិស្សទី ${idx + 1}`;
          let gender = row['ភេទ'] || row['Gender'] || 'M';
          if (gender === 'ស្រី' || gender === 'f' || gender === 'F') gender = 'F';
          else gender = 'M';

          const phone = row['លេខទូរសព្ទ'] || row['Phone'] || row['Parent Phone'] || '';

          return {
            student_id_number: String(idNum).trim(),
            full_name: String(fullName).trim(),
            gender,
            parent_phone: String(phone).trim(),
            is_active: true,
          };
        }).filter(s => s.full_name !== '');

        setParsedData(students);
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setErrorMsg('មិនអាចអានឯកសារ Excel បានទេ។ សូមពិនិត្យទម្រង់ឯកសារ។');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleSave() {
    if (parsedData.length === 0) return;
    setLoading(true);

    if (isDemoMode || !activeClass) {
      setTimeout(() => {
        onSuccess(parsedData.map((s, idx) => ({ ...s, id: `import-${idx}-${Date.now()}`, class_id: activeClass?.id || 'demo-class-1' })));
        setLoading(false);
        onClose();
      }, 500);
      return;
    }

    try {
      const payload = parsedData.map(s => ({
        ...s,
        class_id: activeClass.id,
      }));

      const { data, error } = await supabase.from('students').insert(payload).select();
      if (error) {
        throw error;
      }

      onSuccess(data || payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'កំហុសក្នុងការរក្សាទុកទៅ Supabase។');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                បញ្ចូលបញ្ជីឈ្មោះសិស្សពី Excel / CSV
              </h2>
              <p className="text-xs text-slate-500">
                ថ្នាក់៖ <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeClass?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedData.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                dragActive
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-1">
                ជ្រើសរើស ឬទាញទម្លាក់ឯកសារ Excel នៅទីនេះ (.xlsx, .csv)
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                ជួរឈរ (Columns) គួរតែមាន៖ <span className="font-bold text-indigo-500">អត្តលេខ</span>, <span className="font-bold text-indigo-500">គោត្តនាម និងនាម</span>, <span className="font-bold text-indigo-500">ភេទ</span> (ប្រុស/ស្រី ឬ M/F), និង <span className="font-bold text-indigo-500">លេខទូរសព្ទ</span>។
              </p>
              <label className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 cursor-pointer transition-all">
                <span>ជ្រើសរើសឯកសារ Excel</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  ទិន្នន័យអានបានចំនួន៖ <span className="text-indigo-600 dark:text-indigo-400 font-black">{parsedData.length} នាក់</span>
                </span>
                <button
                  onClick={() => setParsedData([])}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  ជ្រើសរើសឯកសារផ្សេង
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-extrabold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3">ល.រ</th>
                      <th className="p-3">អត្តលេខ</th>
                      <th className="p-3">គោត្តនាម & នាម</th>
                      <th className="p-3 text-center">ភេទ</th>
                      <th className="p-3">ទូរសព្ទ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {parsedData.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono">{s.student_id_number}</td>
                        <td className="p-3 font-bold">{s.full_name}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full ${s.gender === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'}`}>
                            {s.gender === 'F' ? 'ស្រី' : 'ប្រុស'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{s.parent_phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            បោះបង់
          </button>
          <button
            type="button"
            disabled={parsedData.length === 0 || loading}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>រក្សាទុកសិស្ស {parsedData.length} នាក់</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
