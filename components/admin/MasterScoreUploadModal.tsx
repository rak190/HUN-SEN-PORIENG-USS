import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { parseMasterExcel, ParsedStudentScore } from '@/lib/excel-parser';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';

interface MasterScoreUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: string;
}

export function MasterScoreUploadModal({ isOpen, onClose, selectedPeriod }: MasterScoreUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'fetching' | 'parsing' | 'matching' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Preview Data
  const [readyToUpload, setReadyToUpload] = useState<any[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const processGoogleSheetUrl = async (url: string): Promise<File | null> => {
    try {
      const match = url.match(/\/d\/(.*?)\//);
      if (!match || !match[1]) {
        throw new Error("តំណភ្ជាប់មិនត្រឹមត្រូវ (Invalid Google Sheet URL)");
      }
      const sheetId = match[1];
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("មិនអាចទាញយកទិន្នន័យបានទេ។ សូមប្រាកដថា Google Sheet ត្រូវបានកំណត់ជា 'Anyone with the link' (Public)។");
      }
      
      const blob = await response.blob();
      return new File([blob], 'GoogleSheet_Export.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (err: any) {
      throw new Error(err.message || "មិនអាចភ្ជាប់ទៅកាន់ Google Sheet បានទេ");
    }
  };

  const processFile = async () => {
    if (!file && !sheetUrl) return;
    setStatus('fetching');
    try {
      let targetFile = file;
      
      if (!targetFile && sheetUrl) {
         targetFile = await processGoogleSheetUrl(sheetUrl);
      }
      
      if (!targetFile) throw new Error("មិនមានឯកសារសម្រាប់ដំណើរការ (No file to process)");

      setStatus('parsing');
      // 1. Parse Excel
      const parsedData = await parseMasterExcel(targetFile);
      
      if (parsedData.length === 0) {
        throw new Error('No valid student rows found in the sheet. Please ensure the format matches the standard MOEYS template.');
      }

      setStatus('matching');
      
      // 2. Fetch all classes & students
      const { data: dbClasses, error: classErr } = await supabase.from('classes').select('id, name');
      if (classErr) throw classErr;

      const { data: dbStudents, error: stdErr } = await supabase.from('students').select('id, student_id_number, desk_number, class_id, full_name');
      if (stdErr) throw stdErr;

      const gradesToUpsert: any[] = [];
      const unmatched: any[] = [];

      parsedData.forEach(row => {
        // Try to match by student ID first
        let dbStudent = dbStudents.find(s => s.student_id_number === row.studentIdNumber);
        
        // Fallback: match by desk_number AND class (using extractedGrade)
        if (!dbStudent) {
          // Translate 'A' -> 'ក'
          const translatedClass = row.className.replace('A', 'ក').replace('B', 'ខ').replace('C', 'គ').replace('D', 'ឃ').replace('E', 'ង');
          
          // Combine extracted Grade and Class (e.g., "7" + "ក" => "7 ក" or "៧ ក")
          // We will filter DB classes that include BOTH the grade number AND the translated class letter.
          // DB class names are usually like "៧ ក" or "១០ ក"
          
          // Convert our extracted Arabic grade to Khmer numeral for matching just in case
          const arabicToKhmer: Record<string, string> = {'0':'០','1':'១','2':'២','3':'៣','4':'៤','5':'៥','6':'៦','7':'៧','8':'៨','9':'៩'};
          const khmerGrade = row.extractedGrade.split('').map(c => arabicToKhmer[c] || c).join('');
          
          const potentialClasses = dbClasses.filter(c => {
             // If we extracted a grade, the DB class name must include either the Arabic grade (e.g. "7") or Khmer grade (e.g. "៧")
             const matchesGrade = row.extractedGrade ? (c.name.includes(row.extractedGrade) || c.name.includes(khmerGrade)) : true;
             // AND the DB class name must include the section letter
             const matchesSection = c.name.includes(translatedClass) || translatedClass.includes(c.name);
             return matchesGrade && matchesSection;
          });
          
          if (potentialClasses.length > 0) {
            const classIds = potentialClasses.map(c => c.id);
            dbStudent = dbStudents.find(s => classIds.includes(s.class_id) && s.desk_number === row.deskNumber);
          }
        }

        if (dbStudent) {
          gradesToUpsert.push({
            student_id: dbStudent.id,
            class_id: dbStudent.class_id,
            student_name: dbStudent.full_name, // For preview only
            desk_number: row.deskNumber, // For preview only
            period: selectedPeriod,
            scores: row.scores,
            status: 'draft' // Newly added for Publishing System
          });
        } else {
          unmatched.push(row);
        }
      });

      setReadyToUpload(gradesToUpsert);
      setUnmatchedRows(unmatched);
      setStatus('preview');

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred during file parsing.');
    }
  };

  const confirmUpload = async () => {
    setStatus('uploading');
    try {
      if (readyToUpload.length > 0) {
        // Strip out preview-only fields before upsert
        const cleanPayload = readyToUpload.map(({ student_name, desk_number, ...rest }) => rest);
        
        const { error: upsertErr } = await supabase
          .from('grades')
          .upsert(cleanPayload, { onConflict: 'student_id,period' });
          
        if (upsertErr) {
           console.warn("Upsert failed, falling back to deleting and inserting...", upsertErr);
           // Fallback if unique constraint missing: delete old ones for this period then insert
           const classIdsInvolved = [...new Set(cleanPayload.map(g => g.class_id))];
           for (const cid of classIdsInvolved) {
              await supabase.from('grades').delete().eq('class_id', cid as string).eq('period', selectedPeriod);
           }
           const { error: insertErr } = await supabase.from('grades').insert(cleanPayload);
           if (insertErr) throw insertErr;
        }
      }

      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto pt-20 pb-20">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl overflow-hidden animate-fadeIn my-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#155EEF]" />
            បញ្ចូលពិន្ទុពី Google Sheet
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700">តំណភ្ជាប់ Google Sheet (ឬអាប់ឡូតឯកសារ Excel)</label>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              សូមប្រាកដថា Google Sheet របស់អ្នកត្រូវបានកំណត់ Share ជា <strong>"Anyone with the link"</strong> រួចចម្លងតំណភ្ជាប់មកដាក់ទីនេះ។ ប្រព័ន្ធនឹងទាញយក និងគណនាដោយស្វ័យប្រវត្តិ។
            </p>
            
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => {
                 setSheetUrl(e.target.value);
                 if (e.target.value) setFile(null); // Clear file if url is used
                 setStatus('idle');
                 setErrorMessage('');
              }}
              disabled={status !== 'idle' && status !== 'error'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] transition-colors mb-2"
            />
            
            <div className="flex items-center gap-4 py-2">
               <div className="h-px bg-slate-200 flex-1"></div>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ឬអាប់ឡូតផ្ទាល់</span>
               <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <div 
              className={`border-2 border-dashed rounded-[20px] p-8 text-center transition-all ${file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-[#155EEF] hover:bg-blue-50'} cursor-pointer`}
              onClick={() => status === 'idle' || status === 'error' ? fileInputRef.current?.click() : undefined}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="font-extrabold text-emerald-700">{file.name}</p>
                  <p className="text-xs font-bold text-emerald-600/70">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : sheetUrl ? (
                 <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-blue-100 text-[#155EEF] rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="font-extrabold text-[#155EEF]">ប្រើប្រាស់តំណភ្ជាប់ Google Sheet</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-extrabold text-slate-600">ចុចទីនេះ ដើម្បីជ្រើសរើសឯកសារ</p>
                  <p className="text-xs font-bold text-slate-400">គាំទ្រតែឯកសារ .xlsx ប៉ុណ្ណោះ</p>
                </div>
              )}
            </div>
          </div>

          {status === 'error' && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm font-bold flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p>បញ្ជូនពិន្ទុជោគជ័យ!</p>
                <p className="text-xs mt-1 text-emerald-600 font-medium">សិស្សចំនួន {readyToUpload.length} នាក់ត្រូវបានធ្វើបច្ចុប្បន្នភាពពិន្ទុ។</p>
              </div>
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex gap-4">
                 <div className="flex-1 bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <p className="text-sm font-bold text-blue-800">សិស្សដែលរកឃើញ (Ready)</p>
                    <p className="text-2xl font-black text-blue-600">{readyToUpload.length}</p>
                 </div>
                 <div className="flex-1 bg-rose-50 border border-rose-100 p-4 rounded-xl">
                    <p className="text-sm font-bold text-rose-800">សិស្សដែលរកមិនឃើញ (Skipped)</p>
                    <p className="text-2xl font-black text-rose-600">{unmatchedRows.length}</p>
                 </div>
              </div>

              {unmatchedRows.length > 0 && (
                 <div className="border border-rose-200 rounded-xl overflow-hidden">
                    <div className="bg-rose-50 px-4 py-2 border-b border-rose-200 font-bold text-sm text-rose-700 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" /> សិស្សដែលប្រព័ន្ធរកមិនឃើញ (សូមពិនិត្យអត្តលេខក្នុង Excel)
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-white p-2">
                       <ul className="text-xs text-rose-600 space-y-1">
                          {unmatchedRows.map((r, i) => (
                             <li key={i}>• អត្តលេខ៖ {r.studentIdNumber || 'គ្មាន'} | លេខតុ៖ {r.deskNumber || 'គ្មាន'} | ថ្នាក់៖ {r.className}</li>
                          ))}
                       </ul>
                    </div>
                 </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                 <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-sm text-slate-700">
                    ទិដ្ឋភាពទូទៅនៃពិន្ទុដែលបានគណនា (Preview Calculated Scores)
                 </div>
                 <div className="max-h-64 overflow-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                       <thead className="bg-slate-100 sticky top-0">
                          <tr>
                             <th className="p-3 font-black text-slate-600 border-b">លេខតុ</th>
                             <th className="p-3 font-black text-slate-600 border-b">ឈ្មោះសិស្ស</th>
                             <th className="p-3 font-black text-slate-600 border-b">ពិន្ទុ (ឧទាហរណ៍)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {readyToUpload.slice(0, 100).map((row, i) => (
                             <tr key={i} className="hover:bg-slate-50">
                                <td className="p-3 font-mono">{row.desk_number}</td>
                                <td className="p-3 font-bold">{row.student_name}</td>
                                <td className="p-3 text-slate-500 font-mono">
                                   {Object.entries(row.scores || {}).slice(0,3).map(([k,v]) => `${k}: ${v}`).join(', ')} ...
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 {readyToUpload.length > 100 && (
                    <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">បង្ហាញត្រឹម 100 នាក់ដំបូង</div>
                 )}
              </div>
            </div>
          )}
          
          {(status === 'fetching' || status === 'parsing' || status === 'matching' || status === 'uploading') && (
             <div className="p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 text-sm font-bold flex items-center gap-3">
              <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
              <p>
                {status === 'fetching' && 'កំពុងទាញយកទិន្នន័យពី Google Sheet...'}
                {status === 'parsing' && 'កំពុងអានទិន្នន័យពី Excel...'}
                {status === 'matching' && 'កំពុងផ្ទៀងផ្ទាត់សិស្ស...'}
                {status === 'uploading' && 'កំពុងរក្សាទុកក្នុងប្រព័ន្ធ...'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={status !== 'idle' && status !== 'error' && status !== 'success'}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-sm disabled:opacity-50"
          >
            បិទ
          </button>
          {status === 'preview' ? (
             <button
               onClick={confirmUpload}
               className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center gap-2"
             >
               <CheckCircle2 className="w-4 h-4" /> យល់ព្រម និងរក្សាទុក ({readyToUpload.length})
             </button>
          ) : (
             <button
               onClick={processFile}
               disabled={(!file && !sheetUrl) || (status !== 'idle' && status !== 'error')}
               className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
             >
               {status !== 'idle' && status !== 'error' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងដំណើរការ</>
               ) : (
                  <><Upload className="w-4 h-4" /> ទាញយក និងគណនា</>
               )}
             </button>
          )}
        </div>
      </div>
    </div>
  );
}
