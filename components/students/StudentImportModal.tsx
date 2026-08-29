'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Upload, FileSpreadsheet, Check, AlertTriangle, X, Loader2, ArrowRight, Download } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const supabase = createClient();

  if (!isOpen || !mounted) return null;

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
          const deskNumber = row['ប្លង់តុ'] || row['លេខតុ'] || row['Desk Number'] || row['Seat'] || null;
          const roomNumber = row['លេខបន្ទប់'] || row['បន្ទប់'] || row['Room Number'] || row['Room'] || null;

          return {
            student_id_number: String(idNum).trim(),
            full_name: String(fullName).trim(),
            gender,
            parent_phone: String(phone).trim(),
            desk_number: deskNumber ? String(deskNumber).trim() : null,
            room_number: roomNumber ? String(roomNumber).trim() : null,
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

  const handleDownloadTemplate = () => {
    const wsData = [
      { 'អត្តលេខ': 'ID-001', 'គោត្តនាម និងនាម': 'សុខ សាន្ត', 'ភេទ': 'M', 'ប្លង់តុ': '001', 'លេខបន្ទប់': '1', 'លេខទូរសព្ទ': '012345678' },
      { 'អត្តលេខ': 'ID-002', 'គោត្តនាម និងនាម': 'កែវ ធីតា', 'ភេទ': 'F', 'ប្លង់តុ': '002', 'លេខបន្ទប់': '1', 'លេខទូរសព្ទ': '098765432' }
    ];
    const ws = XLSX.utils.json_to_sheet(wsData);
    
    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student_Template");
    XLSX.writeFile(wb, "KruSmart_Student_Import_Template.xlsx");
  };

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-overlayFade" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modalScale" onClick={e => e.stopPropagation()}>
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
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              អូសទម្លាក់ឯកសារ Excel នៅទីនេះ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              គាំទ្រឯកសារ .xlsx, .xls, .csv
            </p>

            <label className="inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all">
              <span>ជ្រើសរើសឯកសារ</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">
                  មើលគំរូទិន្នន័យ (បានរកឃើញ {parsedData.length} នាក់)
                </span>
                <span className="text-xs text-emerald-600 font-bold flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>រួចរាល់សម្រាប់ការរក្សាទុក</span>
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="p-3">អត្តលេខ</th>
                      <th className="p-3">ឈ្មោះពេញ</th>
                      <th className="p-3">ភេទ</th>
                      <th className="p-3">ថ្ងៃខែឆ្នាំកំណើត</th>
                      <th className="p-3">លេខទូរស័ព្ទ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono">{row.student_id_number || '-'}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{row.full_name}</td>
                        <td className="p-3">{row.gender === 'F' ? 'ស្រី' : 'ប្រុស'}</td>
                        <td className="p-3">{row.date_of_birth || '-'}</td>
                        <td className="p-3">{row.guardian_phone || row.student_phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    ... និង {parsedData.length - 10} នាក់ផ្សេងទៀត
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
    </div>,
    document.body
  );
}
