'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Loader2, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { massProfileUpdateAction } from '../actions';

interface MassProfileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  onComplete: () => void;
}

export default function MassProfileImportModal({
  isOpen,
  onClose,
  students,
  onComplete
}: MassProfileImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importResult, setImportResult] = useState<{count: number, errors: any[]} | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Generate template with existing students
    const wsData = students.map(s => ({
      'ID (Do Not Change)': s.id,
      'អត្តលេខ': s.student_id_number || '',
      'ឈ្មោះពេញ': s.full_name || '',
      'ភេទ': s.gender || '',
      'ថ្ងៃខែឆ្នាំកំណើត (YYYY-MM-DD)': s.date_of_birth || '',
      'ទូរស័ព្ទសិស្ស': s.student_phone || '',
      'ស្ថានភាព (new/repeater)': s.status || 'new',
      'ទម្ងន់ (Kg)': s.weight_kg || '',
      'កម្ពស់ (m)': s.height_m || '',
      'ពិការភាព (none/mild/severe)': s.disability || 'none',
      'ឈ្មោះឪពុក': s.father_name || '',
      'ទូរស័ព្ទឪពុក': s.father_phone || '',
      'ឈ្មោះម្តាយ': s.mother_name || '',
      'ទូរស័ព្ទម្តាយ': s.mother_phone || '',
      'អាសយដ្ឋានបច្ចុប្បន្ន': s.current_address || ''
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Lock the ID column if possible, but for simple export we just warn
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profile Update");
    XLSX.writeFile(wb, `Class_Profile_Template_${new Date().getTime()}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setImportResult(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          throw new Error('ឯកសារទទេ (Empty file)');
        }

        const mapped = data.map((row: any) => ({
          id: row['ID (Do Not Change)'],
          student_id_number: row['អត្តលេខ'],
          full_name: row['ឈ្មោះពេញ'],
          date_of_birth: row['ថ្ងៃខែឆ្នាំកំណើត (YYYY-MM-DD)'],
          student_phone: row['ទូរស័ព្ទសិស្ស'],
          status: row['ស្ថានភាព (new/repeater)'],
          weight_kg: parseFloat(row['ទម្ងន់ (Kg)']) || undefined,
          height_m: parseFloat(row['កម្ពស់ (m)']) || undefined,
          disability: row['ពិការភាព (none/mild/severe)'],
          father_name: row['ឈ្មោះឪពុក'],
          father_phone: row['ទូរស័ព្ទឪពុក'],
          mother_name: row['ឈ្មោះម្តាយ'],
          mother_phone: row['ទូរស័ព្ទម្តាយ'],
          current_address: row['អាសយដ្ឋានបច្ចុប្បន្ន']
        })).filter(s => !!s.id); // Must have ID

        setPreviewData(mapped);
      } catch (err: any) {
        setErrorMsg(err.message || 'មានបញ្ហាក្នុងការអានឯកសារ Excel');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    
    setLoading(true);
    setErrorMsg('');
    setImportResult(null);

    try {
      const res = await massProfileUpdateAction(previewData);
      if (!res.success) throw new Error('ការបញ្ចូលបរាជ័យ (Import failed)');

      setImportResult({ count: res.count, errors: res.errors || [] });
      if (res.errors && res.errors.length > 0) {
         // Show partial success
         setErrorMsg(`បញ្ជូលបាន ${res.count} នាក់, បរាជ័យ ${res.errors.length} នាក់។`);
      } else {
         alert(`បានធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូបសិស្សចំនួន ${res.count} នាក់!`);
         onComplete();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'មានបញ្ហាក្នុងការបញ្ចូលទិន្នន័យ');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md z-[9999] flex items-start justify-center pt-10 sm:pt-16 pb-10 px-4 overflow-y-auto animate-overlayFade select-none">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-4xl w-full shadow-2xl relative animate-modalScale border border-slate-100/80 flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 shrink-0">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">Mass Profile Update</h3>
            <p className="text-xs text-slate-500 font-semibold">
              ទាញយកគំរូ បំពេញទិន្នន័យ និងបញ្ចូលមកវិញដើម្បីធ្វើបច្ចុប្បន្នភាពលឿន
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold shrink-0">
            <div className="flex items-center gap-2 mb-2">
               <AlertTriangle className="w-4 h-4 text-rose-600" />
               <span className="text-sm">{errorMsg}</span>
            </div>
            {importResult?.errors && importResult.errors.length > 0 && (
               <ul className="list-disc pl-5 space-y-1 font-semibold text-rose-600">
                  {importResult.errors.map((err, i) => (
                     <li key={i}>{err.name} (ID: {err.id}): {err.reason}</li>
                  ))}
               </ul>
            )}
            {importResult && (
               <button 
                  onClick={onComplete}
                  className="mt-4 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl"
               >
                  បិទ និងផ្ទុកឡើងវិញ (Refresh)
               </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 shrink-0">
           <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
              <h4 className="font-bold text-sm text-slate-700 mb-2">ជំហានទី ១: ទាញយកទិន្នន័យសិស្ស</h4>
              <p className="text-xs text-slate-500 mb-4">ទាញយកឯកសារ Excel ដែលមានឈ្មោះសិស្សក្នុងថ្នាក់ស្រាប់។ ហាមកែប្រែ ID។</p>
              <button 
                 onClick={handleDownloadTemplate}
                 className="w-full py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                 ទាញយក Excel
              </button>
           </div>
           <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50">
              <h4 className="font-bold text-sm text-indigo-800 mb-2">ជំហានទី ២: បញ្ចូលឯកសារដែលបានបំពេញ</h4>
              <p className="text-xs text-indigo-600/70 mb-4">ជ្រើសរើសឯកសារ Excel ដែលអ្នកបានបំពេញទិន្នន័យរួច។</p>
              <input 
                 type="file" 
                 accept=".xlsx, .xls" 
                 ref={fileInputRef}
                 className="hidden" 
                 onChange={handleFileUpload} 
              />
              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                 <Upload className="w-4 h-4" /> ជ្រើសរើសឯកសារ
              </button>
           </div>
        </div>

        {previewData.length > 0 && (
           <div className="flex-1 overflow-auto border border-slate-200 rounded-xl mb-6">
              <table className="w-full text-left text-xs">
                 <thead className="bg-slate-100 sticky top-0">
                    <tr>
                       <th className="p-3 font-bold text-slate-600">អត្តលេខ</th>
                       <th className="p-3 font-bold text-slate-600">ឈ្មោះ</th>
                       <th className="p-3 font-bold text-slate-600">ថ្ងៃកំណើត</th>
                       <th className="p-3 font-bold text-slate-600">អាសយដ្ឋាន</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {previewData.map((s, i) => (
                       <tr key={i}>
                          <td className="p-3">{s.student_id_number}</td>
                          <td className="p-3 font-bold">{s.full_name}</td>
                          <td className="p-3">{s.date_of_birth}</td>
                          <td className="p-3">{s.current_address}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 shrink-0 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
          >
            បោះបង់
          </button>
          <button
            onClick={handleImport}
            disabled={loading || previewData.length === 0}
            className="w-full sm:w-auto flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            <span>រក្សាទុកទិន្នន័យសិស្ស ({previewData.length} នាក់)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
