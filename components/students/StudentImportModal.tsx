'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Upload, FileSpreadsheet, Check, AlertTriangle, X, Loader2, Info } from 'lucide-react';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStudents: any[]) => void;
}

type ValidationStatus = 'valid' | 'missing_optional' | 'duplicate' | 'invalid';

interface ParsedStudent {
  rowNumber: number;
  data: any;
  status: ValidationStatus;
  errors: { column: string; problem: string; suggestion: string }[];
  warnings: { column: string; problem: string }[];
}

export default function StudentImportModal({ isOpen, onClose, onSuccess }: StudentImportModalProps) {
  const { activeClass, isDemoMode } = useAuth();
  const [parsedRows, setParsedRows] = useState<ParsedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const supabase = createClient();

  if (!isOpen || !mounted) return null;

  function parseDate(dob: any) {
    if (!dob) return null;
    if (typeof dob === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const parsedDate = new Date(excelEpoch.getTime() + dob * 86400000);
      return parsedDate.toISOString().split('T')[0];
    }
    if (typeof dob === 'string') {
      if (dob.includes('/')) {
        const parts = dob.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (dob.includes('-')) {
        const parts = dob.split('-');
        if (parts.length === 3) {
           return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const d = new Date(dob);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
  }

  function cleanString(val: any) {
    if (!val) return '';
    const s = String(val).trim();
    if (s === 'មិនមាន' || s === 'គ្មាន' || s === '-' || s === '0' || s === '#REF!') return '';
    return s;
  }

  function handleFileChange(file: File) {
    setErrorMsg('');
    setParsedRows([]);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Find the header row index (we know it's around row 4 in the school template)
        // sheet_to_json with header: 1 gives us arrays of rows.
        const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (allRows.length === 0) {
          setErrorMsg('ឯកសារ Excel មិនមានទិន្នន័យទេ។');
          return;
        }

        // Find the actual header row by looking for 'អត្តលេខ'
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, allRows.length); i++) {
          if (allRows[i].some(cell => String(cell).includes('អត្តលេខ'))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
           setErrorMsg('មិនអាចរកឃើញក្បាលជួរឈរ (អត្តលេខ) នៅក្នុងឯកសារទេ។ សូមពិនិត្យទម្រង់ឯកសារម្តងទៀត។');
           return;
        }

        const headers = allRows[headerRowIdx];
        const dataRows = allRows.slice(headerRowIdx + 1);

        let existingIds: string[] = [];
        if (activeClass?.id) {
          const { data: existingData } = await supabase
            .from('students')
            .select('student_id_number')
            .eq('class_id', activeClass.id);
          if (existingData) {
            existingIds = existingData.map(d => String(d.student_id_number).trim().toLowerCase());
          }
        }

        const results: ParsedStudent[] = [];
        const seenIdsInFile = new Set<string>();

        dataRows.forEach((rowArr, rowIdx) => {
          // If the row is completely empty, skip it.
          if (rowArr.every(cell => !String(cell).trim())) return;

          // Convert array to object based on headers
          const row: Record<string, any> = {};
          headers.forEach((h, i) => {
             if (h) {
                // If there are duplicate headers, keep the first or append index
                const key = String(h).trim();
                if (!row[key]) {
                   row[key] = rowArr[i];
                } else {
                   row[`${key}_${i}`] = rowArr[i];
                }
             }
          });

          // Also map by index for absolute certainty based on Phase 3 analysis:
          // Col 3 = អត្តលេខ
          // Col 4 = នាមត្រកូល, Col 5 = នាមខ្លួន
          // Col 6 = ភេទ
          // Col 10 = (DD/MM/YYYY) 22/01/2001
          // Col 30 = លេខទូរស័ព្ទសិស្ស, Col 43 = ម្តាយ, Col 47 = អាណាព្យាបាល

          const idNumRaw = row['អត្តលេខ'] || rowArr[3] || '';
          const idNum = String(idNumRaw).trim();
          
          const lastName = String(row['នាមត្រកូល'] || rowArr[4] || '').trim();
          const firstName = String(row['នាមខ្លួន'] || rowArr[5] || '').trim();
          const fullName = (lastName + ' ' + firstName).trim() || String(row['នាមត្រកូល និងនាមខ្លួន'] || '').trim();

          const genderRaw = row['ភេទ'] || rowArr[6] || '';
          let gender = 'M';
          if (String(genderRaw).toLowerCase() === 'ស្រី' || String(genderRaw).toLowerCase() === 'f') gender = 'F';

          const dobRaw = row['(DD/MM/YYYY) 22/01/2001'] || row['ថ្ងៃខែឆ្នាំកំណើត'] || rowArr[10] || '';
          const formattedDob = parseDate(dobRaw);

          const phoneRaw1 = row['លេខទូរស័ព្ទសិស្ស'] || rowArr[30] || '';
          const phoneRaw2 = row['លេខទូស័ព្ទ_40'] || rowArr[40] || ''; // Father
          const phoneRaw3 = row['លេខទូស័ព្ទ_43'] || rowArr[43] || ''; // Mother
          const phoneRaw4 = row['លេខទូរស័ព្ទ_47'] || rowArr[47] || ''; // Guardian
          const parent_phone = cleanString(phoneRaw1) || cleanString(phoneRaw2) || cleanString(phoneRaw3) || cleanString(phoneRaw4);

          const addressRaw = row['អាសយដ្ឋានបច្ចុប្បន្ន'] || rowArr[44] || rowArr[48] || '';
          const address = cleanString(addressRaw);

          const weightRaw = row['ទម្ងន់ (គីឡូក្រាម)'] || rowArr[72] || '';
          const heightRaw = row['កម្ពស់ (ម៉ែត្រ)'] || rowArr[73] || '';
          
          const errors: any[] = [];
          const warnings: any[] = [];
          let status: ValidationStatus = 'valid';

          if (!idNum) {
            errors.push({ column: 'អត្តលេខ', problem: 'បាត់អត្តលេខសិស្ស', suggestion: 'សូមបំពេញអត្តលេខ' });
            status = 'invalid';
          }
          if (!fullName) {
             errors.push({ column: 'ឈ្មោះ', problem: 'បាត់ឈ្មោះសិស្ស', suggestion: 'សូមបំពេញនាមត្រកូល និងនាមខ្លួន' });
             status = 'invalid';
          }

          if (idNum) {
            if (existingIds.includes(idNum.toLowerCase()) || seenIdsInFile.has(idNum.toLowerCase())) {
               errors.push({ column: 'អត្តលេខ', problem: 'អត្តលេខស្ទួន', suggestion: 'សិស្សនេះមានរួចហើយនៅក្នុងប្រព័ន្ធ ឬឯកសារនេះ' });
               status = 'duplicate';
            }
            seenIdsInFile.add(idNum.toLowerCase());
          }

          if (status !== 'invalid' && status !== 'duplicate') {
             if (!parent_phone) {
                warnings.push({ column: 'លេខទូរស័ព្ទ', problem: 'មិនមានលេខទូរស័ព្ទទំនាក់ទំនង' });
                status = 'missing_optional';
             }
             if (!formattedDob) {
                warnings.push({ column: 'ថ្ងៃខែឆ្នាំកំណើត', problem: 'ទម្រង់ថ្ងៃខែមិនត្រឹមត្រូវ ឬបាត់' });
                status = 'missing_optional';
             }
          }

          const scholarship = cleanString(rowArr[27]) ? 'yes' : 'no';
          const orphan = cleanString(rowArr[25]) ? 'yes' : 'no';
          
          let disability = 'none';
          const disStr = String(rowArr[23] || '').trim();
          if (disStr && disStr !== 'មិនមាន' && disStr !== 'គ្មាន') {
             disability = 'mild'; // map any disability text to mild or track it in health notes
          }
          
          let idPoor = 'none';
          const poorStr = String(rowArr[26] || '').trim();
          if (poorStr && poorStr !== 'មិនមាន' && poorStr !== 'គ្មាន') idPoor = 'level_1';

          results.push({
            rowNumber: headerRowIdx + 1 + rowIdx + 1, // Excel row number
            status,
            errors,
            warnings,
            data: {
              student_id_number: idNum,
              full_name: fullName,
              gender,
              dob: formattedDob,
              parent_phone,
              address,
              weight_kg: cleanString(weightRaw) ? Number(weightRaw) : null,
              height_m: cleanString(heightRaw) ? Number(heightRaw) : null,
              status: 'new',
              scholarship,
              id_poor: idPoor,
              orphan,
              disability,
              is_active: true,
              health_note: cleanString(rowArr[62]) || cleanString(rowArr[59]) || null,
            }
          });
        });

        if (results.length === 0) {
          setErrorMsg('មិនមានទិន្នន័យត្រឹមត្រូវដែលអាចទាញយកបានទេ។');
          return;
        }

        setParsedRows(results);
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setErrorMsg('មិនអាចអានឯកសារ Excel បានទេ។ សូមពិនិត្យទម្រង់ឯកសារ។');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleSave() {
    const validRows = parsedRows.filter(r => r.status === 'valid' || r.status === 'missing_optional');
    if (validRows.length === 0) return;
    
    setLoading(true);

    if (isDemoMode || !activeClass) {
      setTimeout(() => {
        onSuccess(validRows.map((r, idx) => ({ ...r.data, id: `import-${idx}-${Date.now()}`, class_id: activeClass?.id || 'demo-class-1' })));
        setLoading(false);
        onClose();
      }, 500);
      return;
    }

    try {
      const payload = validRows.map(r => ({
        ...r.data,
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

  const validCount = parsedRows.filter(r => r.status === 'valid').length;
  const missingCount = parsedRows.filter(r => r.status === 'missing_optional').length;
  const duplicateCount = parsedRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = parsedRows.filter(r => r.status === 'invalid').length;
  const savableCount = validCount + missingCount;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-overlayFade" onClick={onClose}>
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modalScale" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                បញ្ចូលបញ្ជីឈ្មោះសិស្សពី Excel (ទម្រង់សាលារៀន)
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-900/50">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedRows.length === 0 && (
             <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
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
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                    អូសទម្លាក់ឯកសារ Excel នៅទីនេះ
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    គាំទ្រឯកសារ .xlsx ស្របតាមទម្រង់ស្តង់ដារបស់សាលា (៩៩ ជួរឈរ)
                  </p>

                  <label className="inline-flex items-center space-x-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold shadow-sm cursor-pointer transition-all">
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
                
                <div className="mt-6 flex items-start space-x-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                     <p className="font-bold mb-1">គោលការណ៍នាំចូលទិន្នន័យ៖</p>
                     <ul className="list-disc pl-5 space-y-1 opacity-90">
                        <li>សិស្សដែលបាត់ព័ត៌មានមិនចាំបាច់ (លេខទូរស័ព្ទ, អាសយដ្ឋាន) នឹងនៅតែត្រូវបានអនុញ្ញាតឱ្យបញ្ចូល។</li>
                        <li>អត្តលេខសិស្ស និងឈ្មោះ គឺជាព័ត៌មានចាំបាច់។</li>
                        <li>ទិន្នន័យដែលមានពាក្យ "មិនមាន" នឹងត្រូវរក្សាទុកតាមប្រភពដើម។</li>
                     </ul>
                  </div>
                </div>
             </div>
          )}

          {/* Validation & Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                 <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{validCount}</span>
                    <span className="text-xs font-bold text-slate-500">ត្រឹមត្រូវ ✓</span>
                 </div>
                 <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{missingCount}</span>
                    <span className="text-xs font-bold text-slate-500 text-center">បាត់ព័ត៌មានមិនចាំបាច់ ⚠<br/>(នៅតែអាចបញ្ចូលបាន)</span>
                 </div>
                 <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center opacity-70">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{duplicateCount}</span>
                    <span className="text-xs font-bold text-slate-500">ស្ទួន ✗</span>
                 </div>
                 <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center opacity-70">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{invalidCount}</span>
                    <span className="text-xs font-bold text-slate-500">មិនត្រឹមត្រូវ ✗</span>
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-16 text-center">ជួរ</th>
                        <th className="p-3">អត្តលេខ</th>
                        <th className="p-3">ឈ្មោះពេញ</th>
                        <th className="p-3">ស្ថានភាព</th>
                        <th className="p-3">បញ្ហា / ដំណោះស្រាយ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.map((row, i) => (
                        <tr key={i} className={`
                           ${row.status === 'invalid' ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}
                           ${row.status === 'duplicate' ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}
                           ${row.status === 'missing_optional' ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}
                           hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors
                        `}>
                          <td className="p-3 text-center font-mono text-xs text-slate-400">{row.rowNumber}</td>
                          <td className="p-3 font-mono font-medium">{row.data.student_id_number || '-'}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{row.data.full_name || '-'}</td>
                          <td className="p-3">
                             {row.status === 'valid' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">✓ ត្រឹមត្រូវ</span>}
                             {row.status === 'missing_optional' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">⚠ បាត់ព័ត៌មានខ្លះ</span>}
                             {row.status === 'invalid' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold">✗ មិនត្រឹមត្រូវ</span>}
                             {row.status === 'duplicate' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold">✗ ស្ទួន</span>}
                          </td>
                          <td className="p-3 text-xs">
                             {row.errors.length > 0 && (
                                <ul className="text-rose-600 dark:text-rose-400 space-y-1">
                                   {row.errors.map((e, idx) => (
                                      <li key={idx}><b>{e.column}:</b> {e.problem} — <i>{e.suggestion}</i></li>
                                   ))}
                                </ul>
                             )}
                             {row.warnings.length > 0 && (
                                <ul className="text-amber-600 dark:text-amber-400 space-y-1 mt-1">
                                   {row.warnings.map((w, idx) => (
                                      <li key={idx}><b>{w.column}:</b> {w.problem} (អនុញ្ញាតឱ្យបញ្ចូល)</li>
                                   ))}
                                </ul>
                             )}
                             {row.errors.length === 0 && row.warnings.length === 0 && (
                                <span className="text-emerald-600 dark:text-emerald-500">រួចរាល់សម្រាប់ការរក្សាទុក</span>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                   <button onClick={() => setParsedRows([])} className="text-slate-500 hover:text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      ← ជ្រើសរើសឯកសារផ្សេង
                   </button>
                   <span className="text-slate-600 dark:text-slate-400 font-medium">
                      សិស្សសរុប {parsedRows.length} នាក់ (អាចបញ្ចូលបាន <span className="font-bold text-emerald-600 dark:text-emerald-400">{savableCount} នាក់</span>)
                   </span>
                </div>
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
            disabled={savableCount === 0 || loading}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>រក្សាទុកសិស្ស {savableCount} នាក់</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
