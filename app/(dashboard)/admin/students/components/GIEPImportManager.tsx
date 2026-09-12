'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, Check, X, Loader2, ArrowRightLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

import { useAuth } from '@/lib/auth-context';
import { processGiepMatchingAction } from '../actions';

interface GIEPImportManagerProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export default function GIEPImportManager({ onClose, onImportComplete }: GIEPImportManagerProps) {
  const { activeAcademicYear } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<'upload' | 'preview' | 'exception'>('upload');
  
  // Data states
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [matched, setMatched] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [newRecords, setNewRecords] = useState<any[]>([]);

  const processGiepMatching = async (parsed: any[]) => {
     if (!activeAcademicYear?.id) {
       setErrorMsg('មិនមានឆ្នាំសិក្សាសម្រាប់ដំណើរការ។');
       return;
     }
     try {
       const res = await processGiepMatchingAction(parsed, activeAcademicYear.id);
       if (res.success) {
         setMatched(res.matched || []);
         setConflicts(res.conflicts || []);
         setNewRecords(res.newRecords || []);
         setStep('preview');
       } else {
         setErrorMsg(res.error || 'បរាជ័យក្នុងការផ្ទៀងផ្ទាត់ទិន្នន័យ');
       }
     } catch(err: any) {
       setErrorMsg(err.message);
     }
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setErrorMsg('');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Look for GIEP sheet specifically
          const sheetName = workbook.SheetNames.find(name => name.includes('ព័ត៌.សិស្ស'));
          if (!sheetName) {
             throw new Error('រកមិនឃើញសន្លឹក "4-៣.០_ព័ត៌.សិស្ស" នៅក្នុងឯកសារ GIEP នេះទេ។');
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          // Row 4 (index 3) is usually the detailed header in GIEP format
          // Let's dynamically find it by looking for 'អត្តលេខ'
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(10, allRows.length); i++) {
             if (allRows[i].includes('អត្តលេខ') || allRows[i].includes('អត្តលេខ')) {
                headerRowIdx = i;
                break;
             }
          }
          
          if (headerRowIdx === -1) {
             throw new Error('រកមិនឃើញជួរ Header ផ្លូវការដែលមានពាក្យ "អត្តលេខ" ទេ។');
          }

          const headers = allRows[headerRowIdx];
          
          // Build column indices mapping dynamically in case columns shift slightly
          const colMap = {
            id: headers.findIndex(h => typeof h === 'string' && h.includes('អត្តលេខ')),
            lastName: headers.findIndex(h => typeof h === 'string' && h.includes('នាមត្រកូល')),
            firstName: headers.findIndex(h => typeof h === 'string' && h.includes('នាមខ្លួន')),
            gender: headers.findIndex(h => typeof h === 'string' && h.includes('ភេទ')),
            dobDay: headers.findIndex(h => typeof h === 'string' && h.includes('ថ្ងៃ')),
            dobMonth: headers.findIndex(h => typeof h === 'string' && h.includes('ខែ')),
            dobYear: headers.findIndex(h => typeof h === 'string' && h.includes('ឆ្នាំ')),
            grade: headers.findIndex(h => typeof h === 'string' && h.includes('ថ្នាក់ទី')),
            room: headers.findIndex(h => typeof h === 'string' && h.includes('បន្ទប់')),
            orphan: headers.findIndex(h => typeof h === 'string' && h.includes('កំព្រា')),
            idPoor: headers.findIndex(h => typeof h === 'string' && h.includes('បណ្ណក្រីក្រ')),
            scholarship: headers.findIndex(h => typeof h === 'string' && h.includes('អាហារូបករណ៍')),
            deskNum: headers.findIndex(h => typeof h === 'string' && h.includes('លេខតុ')),
            roomNum: headers.findIndex(h => typeof h === 'string' && h.includes('លេខបន្ទប់')),
            fatherName: headers.findIndex(h => typeof h === 'string' && h.includes('ឈ្មោះឪពុក')),
            fatherPhone: headers.findIndex((h, idx) => typeof h === 'string' && h.includes('លេខទូស័ព្ទ') && idx > 30 && idx < 42),
            motherName: headers.findIndex(h => typeof h === 'string' && h.includes('ឈ្មោះម្តាយ')),
            motherPhone: headers.findIndex((h, idx) => typeof h === 'string' && h.includes('លេខទូស័ព្ទ') && idx > 41),
            weight: headers.findIndex(h => typeof h === 'string' && h.includes('ទម្ងន់')),
            height: headers.findIndex(h => typeof h === 'string' && h.includes('កម្ពស់')),
          };

          const rawDataRows = allRows.slice(headerRowIdx + 2).filter(row => row[colMap.id] && String(row[colMap.id]).trim() !== '');

          const parsed = rawDataRows.map((row, index) => {
             // Basic normalization
             const idNum = String(row[colMap.id] || '').trim();
             const lName = String(row[colMap.lastName] || '').trim();
             const fName = String(row[colMap.firstName] || '').trim();
             const gender = String(row[colMap.gender] || '').trim();
             
             // Construct class name (e.g., 7 + A = 7A)
             const grade = String(row[colMap.grade] || '').trim();
             const room = String(row[colMap.room] || '').trim();
             const className = `${grade}${room}`.replace(/\s/g, '');

             return {
               originalIndex: index,
               student_id_number: idNum,
               full_name: `${lName} ${fName}`.trim(),
               gender: ['ស្រី', 'f', 'F'].includes(gender) ? 'F' : 'M',
               class_name: className,
               dob_day: row[colMap.dobDay],
               dob_month: row[colMap.dobMonth],
               dob_year: row[colMap.dobYear],
               orphan: String(row[colMap.orphan] || ''),
               id_poor: String(row[colMap.idPoor] || ''),
               scholarship: String(row[colMap.scholarship] || ''),
               desk_number: String(row[colMap.deskNum] || ''),
               room_number: String(row[colMap.roomNum] || ''),
               father_name: String(row[colMap.fatherName] || ''),
               father_phone: String(row[colMap.fatherPhone] || ''),
               mother_name: String(row[colMap.motherName] || ''),
               mother_phone: String(row[colMap.motherPhone] || ''),
               weight_kg: row[colMap.weight],
               height_m: row[colMap.height],
             };
          });
          
          setParsedRows(parsed);
          
          // Now we must match these against the database
          // For that we need to call a server action
          await processGiepMatching(parsed);
          
        } catch (err: any) {
          setErrorMsg(err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setErrorMsg('បរាជ័យក្នុងការអានឯកសារ។');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">GIEP Import Center</h2>
              <p className="text-xs text-slate-500">នាំចូលទិន្នន័យពីប្រព័ន្ធ GIEP (4-៣.០_ព័ត៌.សិស្ស)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {errorMsg && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold">{errorMsg}</span>
            </div>
          )}

          {step === 'upload' && (
            <div 
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
              }`}
            >
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">អូសឯកសារ GIEP ទម្លាក់នៅទីនេះ</h3>
              <p className="text-sm text-slate-500 mb-8">ទទួលយកឯកសារ Excel (.xlsx) ផ្លូវការរបស់ប្រព័ន្ធ GIEP</p>
              
              <label className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-blue-500/20 inline-flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ជ្រើសរើសឯកសារ'}
                <input 
                  type="file" 
                  accept=".xlsx" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  disabled={loading}
                />
              </label>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="flex-1 bg-white p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-3xl font-black text-emerald-600">{matched.length}</div>
                    <div className="text-sm font-bold text-slate-500">ផ្គូផ្គង (Matched)</div>
                 </div>
                 <div className="flex-1 bg-white p-4 rounded-xl border border-amber-200 text-center">
                    <div className="text-3xl font-black text-amber-600">{conflicts.length}</div>
                    <div className="text-sm font-bold text-slate-500">ភាពមិនប្រក្រតី (Conflicts)</div>
                 </div>
                 <div className="flex-1 bg-white p-4 rounded-xl border border-blue-200 text-center">
                    <div className="text-3xl font-black text-blue-600">{newRecords.length}</div>
                    <div className="text-sm font-bold text-slate-500">ថ្មី (New)</div>
                 </div>
              </div>
              
              <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-[300px]">
                <div className="p-4 bg-slate-100 border-b font-bold flex justify-between items-center">
                   <span>Exception Queue (ទិន្នន័យចាំបាច់ត្រូវពិនិត្យ)</span>
                </div>
                <div className="p-0 overflow-auto max-h-[400px]">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 sticky top-0 border-b">
                         <tr>
                            <th className="p-3 font-bold text-slate-500">ប្រភេទ</th>
                            <th className="p-3 font-bold text-slate-500">អត្តលេខ</th>
                            <th className="p-3 font-bold text-slate-500">ឈ្មោះ</th>
                            <th className="p-3 font-bold text-slate-500">ភេទ</th>
                            <th className="p-3 font-bold text-slate-500">ថ្នាក់</th>
                            <th className="p-3 font-bold text-slate-500">ស្ថានភាព / បញ្ហា</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">
                         {conflicts.map((c, i) => (
                           <tr key={`c-${i}`} className="hover:bg-amber-50">
                              <td className="p-3"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">Conflict</span></td>
                              <td className="p-3 font-bold">{c.student_id_number}</td>
                              <td className="p-3">
                                 <div>GIEP: <span className="font-bold">{c.full_name}</span></div>
                                 <div className="text-slate-500">DB: {c.existing.full_name}</div>
                              </td>
                              <td className="p-3">
                                 <div>GIEP: {c.gender}</div>
                                 <div className="text-slate-500">DB: {c.existing.gender}</div>
                              </td>
                              <td className="p-3">{c.class_name}</td>
                              <td className="p-3 text-amber-700 font-semibold text-xs">ទិន្នន័យខុសគ្នា</td>
                           </tr>
                         ))}
                         {newRecords.map((n, i) => (
                           <tr key={`n-${i}`} className="hover:bg-blue-50">
                              <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">New</span></td>
                              <td className="p-3 font-bold">{n.student_id_number}</td>
                              <td className="p-3 font-bold">{n.full_name}</td>
                              <td className="p-3">{n.gender}</td>
                              <td className="p-3">{n.class_name}</td>
                              <td className="p-3 text-blue-700 font-semibold text-xs">មិនមានក្នុងប្រព័ន្ធ</td>
                           </tr>
                         ))}
                         {conflicts.length === 0 && newRecords.length === 0 && (
                            <tr>
                               <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">គ្មានបញ្ហាត្រូវដោះស្រាយទេ</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="p-5 bg-white border-t flex justify-end gap-3">
             <button onClick={() => setStep('upload')} className="px-5 py-2.5 rounded-xl border font-bold hover:bg-slate-50 text-slate-700">
                ថយក្រោយ
             </button>
             <button 
                onClick={async () => {
                   setLoading(true);
                   try {
                      const { processGiepCommitAction } = await import('../actions');
                      const res = await processGiepCommitAction(matched, conflicts, newRecords, activeAcademicYear?.id || '');
                      if (res.success) {
                         onImportComplete();
                      } else {
                         setErrorMsg(res.error || 'បរាជ័យក្នុងការបញ្ជូលទិន្នន័យ');
                      }
                   } catch(err: any) {
                      setErrorMsg(err.message);
                   } finally {
                      setLoading(false);
                   }
                }}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
             >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                យល់ព្រមបញ្ចូលទិន្នន័យ
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
