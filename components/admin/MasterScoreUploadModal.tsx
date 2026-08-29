import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Users, FileCheck, ShieldAlert, Eye } from 'lucide-react';
import { 
  parseMasterExcel, 
  ParsedStudentScore, 
  normalizeStudentId, 
  checkNameMatch, 
  validateScoreCeilings, 
  calculateStudentTotalScore 
} from '@/lib/excel-parser';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { createGradeSnapshot } from '@/app/(dashboard)/admin/master-scores/actions';

interface MasterScoreUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: string;
}

interface VerifiedRow {
  student_id: string;
  class_id: string;
  student_name: string;
  excel_name?: string;
  student_id_number?: string;
  desk_number: string;
  class_name: string;
  scores: Record<string, number>;
  total_score: number;
  average_score: number;
  status: 'draft';
  isNameMismatch: boolean;
  nameSimilarity: number;
  ceilingErrors: string[];
}

export function MasterScoreUploadModal({ isOpen, onClose, selectedPeriod }: MasterScoreUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'fetching' | 'parsing' | 'matching' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Tabs in Preview mode
  const [previewTab, setPreviewTab] = useState<'verified' | 'unmatched' | 'warnings'>('verified');

  // Preview Data
  const [readyToUpload, setReadyToUpload] = useState<VerifiedRow[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<ParsedStudentScore[]>([]);
  const [nameWarnings, setNameWarnings] = useState<VerifiedRow[]>([]);
  const [ceilingViolations, setCeilingViolations] = useState<VerifiedRow[]>([]);
  const [detectedSubjects, setDetectedSubjects] = useState<{ label: string; key: string }[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [isPermissionError, setIsPermissionError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMessage('');
      setIsPermissionError(false);
    }
  };

  const processGoogleSheetUrl = async (url: string): Promise<File | null> => {
    try {
      let exportUrl = url.trim();

      // Case 1: Published to web URL (e.g. /d/e/2PACX-.../pub or pub?output=csv)
      if (url.includes('/d/e/')) {
        if (!exportUrl.includes('output=')) {
          exportUrl = exportUrl.includes('?') ? `${exportUrl}&output=csv` : `${exportUrl}?output=csv`;
        }
        const response = await fetch(exportUrl);
        if (!response.ok) {
          throw new Error("មិនអាចទាញយកទិន្នន័យពីតំណភ្ជាប់ Google Sheet នេះបានទេ។");
        }
        const blob = await response.blob();
        return new File([blob], 'GoogleSheet_Export.csv', { type: 'text/csv' });
      }

      // Case 2: Regular Google Sheet URL (e.g. /d/1ABC.../edit)
      const match = url.match(/\/d\/(.*?)\//);
      if (!match || !match[1]) {
        throw new Error("តំណភ្ជាប់មិនត្រឹមត្រូវ (Invalid Google Sheet URL)");
      }
      const sheetId = match[1];
      exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) {
        setIsPermissionError(true);
        throw new Error("ឯកសារ Google Sheet ជាប់សោរ (Private/Restricted)។ សូមកំណត់សិទ្ធិជា 'Anyone with the link' (Public) រួចព្យាយាមម្តងទៀត។");
      }
      
      const blob = await response.blob();
      return new File([blob], 'GoogleSheet_Export.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (err: any) {
      if (err.message.includes('Public') || err.message.includes('Private')) {
        setIsPermissionError(true);
      }
      throw new Error(err.message || "មិនអាចភ្ជាប់ទៅកាន់ Google Sheet បានទេ");
    }
  };

  const processFile = async () => {
    if (!file && !sheetUrl) return;
    setStatus('fetching');
    setIsPermissionError(false);
    try {
      let targetFile = file;
      
      if (!targetFile && sheetUrl) {
         targetFile = await processGoogleSheetUrl(sheetUrl);
      }
      
      if (!targetFile) throw new Error("មិនមានឯកសារសម្រាប់ដំណើរការ (No file to process)");

      setStatus('parsing');
      // 1. Parse Excel
      const parseResult = await parseMasterExcel(targetFile);
      const parsedData = parseResult.students;
      
      setDetectedSubjects(parseResult.detectedSubjects);
      setDetectedColumns(parseResult.detectedColumns);
      
      if (parsedData.length === 0) {
        throw new Error('មិនមានទិន្នន័យសិស្សត្រឹមត្រូវនៅក្នុងឯកសារនេះទេ។ សូមពិនិត្យមើលក្បាលតារាងគំរូ MoEYS។');
      }

      setStatus('matching');
      
      // 2. Fetch all classes & students
      const { data: dbClasses, error: classErr } = await supabase
        .from('classes')
        .select('id, name, grade, track');
      if (classErr) throw classErr;

      const { data: dbStudents, error: stdErr } = await supabase
        .from('students')
        .select('id, student_id_number, desk_number, class_id, full_name');
      if (stdErr) throw stdErr;

      const verifiedList: VerifiedRow[] = [];
      const unmatchedList: ParsedStudentScore[] = [];
      const nameWarningList: VerifiedRow[] = [];
      const ceilingViolationList: VerifiedRow[] = [];

      parsedData.forEach(row => {
        // Tier 1: Match by normalized student ID
        const normInputId = normalizeStudentId(row.studentIdNumber);
        let dbStudent = normInputId ? dbStudents.find(s => normalizeStudentId(s.student_id_number) === normInputId) : undefined;
        
        // Tier 2: Match by Desk Number + Class Section
        if (!dbStudent && row.deskNumber) {
          const translatedClass = row.className.replace('A', 'ក').replace('B', 'ខ').replace('C', 'គ').replace('D', 'ឃ').replace('E', 'ង');
          const arabicToKhmer: Record<string, string> = {'0':'០','1':'១','2':'២','3':'៣','4':'៤','5':'៥','6':'៦','7':'៧','8':'៨','9':'៩'};
          const khmerGrade = row.extractedGrade.split('').map(c => arabicToKhmer[c] || c).join('');
          
          const potentialClasses = dbClasses.filter(c => {
             const matchesGrade = row.extractedGrade ? (c.name.includes(row.extractedGrade) || c.name.includes(khmerGrade)) : true;
             const matchesSection = c.name.includes(translatedClass) || translatedClass.includes(c.name);
             return matchesGrade && matchesSection;
          });
          
          if (potentialClasses.length > 0) {
            const classIds = potentialClasses.map(c => c.id);
            dbStudent = dbStudents.find(s => classIds.includes(s.class_id) && String(s.desk_number).trim() === String(row.deskNumber).trim());
          }
        }

        // Tier 3: Match by Name + Class (if ID or desk was not matching)
        if (!dbStudent && row.studentNameRaw) {
          const matchedByName = dbStudents.find(s => {
            const res = checkNameMatch(row.studentNameRaw, s.full_name);
            return res.match && res.similarity >= 0.9;
          });
          if (matchedByName) {
            dbStudent = matchedByName;
          }
        }

        if (dbStudent) {
          const classInfo = dbClasses.find(c => c.id === dbStudent?.class_id);
          const nameCheck = checkNameMatch(row.studentNameRaw, dbStudent.full_name);
          const ceilingCheck = validateScoreCeilings(row.scores, classInfo?.grade, classInfo?.track);
          const calcResult = calculateStudentTotalScore(row.scores, classInfo?.grade, classInfo?.track);

          const verifiedItem: VerifiedRow = {
            student_id: dbStudent.id,
            class_id: dbStudent.class_id,
            student_name: dbStudent.full_name,
            excel_name: row.studentNameRaw,
            student_id_number: dbStudent.student_id_number || row.studentIdNumber,
            desk_number: row.deskNumber || dbStudent.desk_number || '',
            class_name: classInfo?.name || row.className,
            scores: row.scores,
            total_score: calcResult.totalScore,
            average_score: calcResult.averageScore,
            status: 'draft',
            isNameMismatch: !nameCheck.match || nameCheck.similarity < 0.6,
            nameSimilarity: nameCheck.similarity,
            ceilingErrors: ceilingCheck.errors
          };

          verifiedList.push(verifiedItem);

          if (verifiedItem.isNameMismatch && row.studentNameRaw) {
            nameWarningList.push(verifiedItem);
          }
          if (ceilingCheck.errors.length > 0) {
            ceilingViolationList.push(verifiedItem);
          }
        } else {
          unmatchedList.push(row);
        }
      });

      setReadyToUpload(verifiedList);
      setUnmatchedRows(unmatchedList);
      setNameWarnings(nameWarningList);
      setCeilingViolations(ceilingViolationList);
      setStatus('preview');
      setPreviewTab(ceilingViolationList.length > 0 ? 'warnings' : 'verified');

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'កំហុសក្នុងការអានឯកសារ Excel');
    }
  };

  const confirmUpload = async () => {
    if (ceilingViolations.length > 0) {
      const proceed = window.confirm(`មានពិន្ទុលើសកម្រិតកំណត់ MoEYS ចំនួន ${ceilingViolations.length} ករណី។ តើអ្នកពិតជាចង់បន្តរក្សាទុកមែនទេ?`);
      if (!proceed) return;
    }

    setStatus('uploading');
    try {
      if (readyToUpload.length > 0) {
        // 1. Automatically create backup snapshot before upserting
        const classIdsInvolved = [...new Set(readyToUpload.map(g => g.class_id))];
        await createGradeSnapshot(
          selectedPeriod, 
          classIdsInvolved, 
          `Auto-Backup មុនពេលអាប់ឡូត ${readyToUpload.length} នាក់ (${new Date().toLocaleDateString('km-KH')})`
        );

        // 2. Prepare payload
        const cleanPayload = readyToUpload.map(item => ({
          student_id: item.student_id,
          class_id: item.class_id,
          period: selectedPeriod,
          scores: item.scores,
          total_score: item.total_score,
          average: item.average_score,
          status: 'draft',
          updated_at: new Date().toISOString()
        }));
        
        const { error: upsertErr } = await supabase
          .from('grades')
          .upsert(cleanPayload, { onConflict: 'student_id,period' });
          
        if (upsertErr) {
           console.warn("Upsert fallback initiated:", upsertErr);
           for (const cid of classIdsInvolved) {
              await supabase.from('grades').delete().eq('class_id', cid).eq('period', selectedPeriod);
           }
           const { error: insertErr } = await supabase.from('grades').insert(cleanPayload);
           if (insertErr) throw insertErr;
        }
      }

      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 1800);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'កំហុសក្នុងការរក្សាទុកពិន្ទុ');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      icon={
        <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
          <Upload className="w-5 h-5" />
        </div>
      }
      title="បញ្ចូលពិន្ទុពី Google Sheet / Excel (Verification Gate)"
    >
      <div className="p-6 sm:p-8 space-y-6">

        {status !== 'preview' && (
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700">តំណភ្ជាប់ Google Sheet (ឬអាប់ឡូតឯកសារ Excel)</label>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              សូមប្រាកដថា Google Sheet របស់អ្នកត្រូវបានកំណត់ Share ជា <strong>"Anyone with the link"</strong> រួចចម្លងតំណភ្ជាប់មកដាក់ទីនេះ។ ប្រព័ន្ធនឹងទាញយក ផ្ទៀងផ្ទាត់ឈ្មោះសិស្ស និងពិនិត្យពិន្ទុអតិបរមាតាមស្តង់ដារ MoEYS មុនពេលរក្សាទុក។
            </p>
            
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => {
                 setSheetUrl(e.target.value);
                 if (e.target.value) setFile(null);
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
                  <p className="font-extrabold text-slate-600">ចុចទីនេះ ដើម្បីជ្រើសរើសឯកសារ Excel</p>
                  <p className="text-xs font-bold text-slate-400">គាំទ្រតែឯកសារ .xlsx ប៉ុណ្ណោះ</p>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm font-bold flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>

            {isPermissionError && (
              <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs space-y-3">
                <p className="font-extrabold text-blue-900 flex items-center gap-1.5">
                  💡 របៀបបើកសិទ្ធិ Google Sheet ឱ្យប្រព័ន្ធអាចទាញយកបាន (៣ ជំហានងាយៗ):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-semibold text-slate-700">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="font-black text-[#155EEF]">១. ចុចប៊ូតុង Share</span>
                    <p className="text-[11px] text-slate-500 mt-1">នៅខាងលើស្តាំនៃ Google Sheets ចុចប៊ូតុង "Share" ពណ៌ខៀវ</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="font-black text-[#155EEF]">២. ប្តូរទៅ Anyone with link</span>
                    <p className="text-[11px] text-slate-500 mt-1">ត្រង់ General access ដូរពី "Restricted" ទៅ "Anyone with the link"</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="font-black text-[#155EEF]">៣. ចម្លងតំណភ្ជាប់</span>
                    <p className="text-[11px] text-slate-500 mt-1">ចុច "Copy link" រួចយកមកបិទភ្ជាប់ (Paste) ក្នុងប្រព័ន្ធម្តងទៀត</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p>បានបញ្ជូនពិន្ទុ និងបង្កើត Snapshot ដោយជោគជ័យ!</p>
              <p className="text-xs mt-1 text-emerald-600 font-medium">សិស្សចំនួន {readyToUpload.length} នាក់ត្រូវបានដាក់ក្នុងស្ថានភាពព្រាង (Draft) រួចរាល់។</p>
            </div>
          </div>
        )}

        {status === 'preview' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Detected Subjects Metadata Pill Bar */}
            {detectedSubjects.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-600 shrink-0">
                  🎯 មុខវិជ្ជាដែលប្រព័ន្ធស្គាល់ ({detectedSubjects.length}):
                </span>
                {detectedSubjects.map((sub, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-100/70 text-[#155EEF] font-extrabold rounded-md text-[11px]">
                    {sub.label}
                  </span>
                ))}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                onClick={() => setPreviewTab('verified')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${previewTab === 'verified' ? 'bg-blue-50/80 border-[#155EEF] shadow-xs' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-600">សិស្សផ្ទៀងផ្ទាត់បាន (Ready)</p>
                  <FileCheck className="w-4 h-4 text-[#155EEF]" />
                </div>
                <p className="text-2xl font-black text-[#155EEF] mt-1">{readyToUpload.length}</p>
              </div>

              <div 
                onClick={() => setPreviewTab('warnings')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${previewTab === 'warnings' ? 'bg-amber-50/80 border-amber-500 shadow-xs' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-600">ការព្រមាន (Warnings)</p>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-amber-600 mt-1">{nameWarnings.length + ceilingViolations.length}</p>
              </div>

              <div 
                onClick={() => setPreviewTab('unmatched')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${previewTab === 'unmatched' ? 'bg-rose-50/80 border-rose-500 shadow-xs' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-600">សិស្សរកមិនឃើញ (Skipped)</p>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-black text-rose-600 mt-1">{unmatchedRows.length}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
              <button
                onClick={() => setPreviewTab('verified')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${previewTab === 'verified' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                តារាងពិន្ទុសិស្ស ({readyToUpload.length})
              </button>
              {nameWarnings.length + ceilingViolations.length > 0 && (
                <button
                  onClick={() => setPreviewTab('warnings')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${previewTab === 'warnings' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> ចំណុចត្រូវប្រុងប្រយ័ត្ន ({nameWarnings.length + ceilingViolations.length})
                </button>
              )}
              {unmatchedRows.length > 0 && (
                <button
                  onClick={() => setPreviewTab('unmatched')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${previewTab === 'unmatched' ? 'border-rose-500 text-rose-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <AlertCircle className="w-3.5 h-3.5" /> រកមិនឃើញ ({unmatchedRows.length})
                </button>
              )}
            </div>

            {/* Content: Verified Table */}
            {previewTab === 'verified' && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 sticky top-0 font-black text-slate-700">
                      <tr>
                        <th className="p-3 border-b">លេខតុ</th>
                        <th className="p-3 border-b">អត្តលេខ</th>
                        <th className="p-3 border-b">ឈ្មោះក្នុងប្រព័ន្ធ (DB)</th>
                        <th className="p-3 border-b">ឈ្មោះក្នុង Excel</th>
                        <th className="p-3 border-b">ថ្នាក់</th>
                        <th className="p-3 border-b text-right">ពិន្ទុសរុប</th>
                        <th className="p-3 border-b text-right">មធ្យមភាគ</th>
                        <th className="p-3 border-b">ស្ថានភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {readyToUpload.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-mono">{row.desk_number || '-'}</td>
                          <td className="p-3 font-mono">{row.student_id_number || '-'}</td>
                          <td className="p-3 font-extrabold text-slate-800">{row.student_name}</td>
                          <td className="p-3 text-slate-500">
                            {row.excel_name || row.student_name}
                          </td>
                          <td className="p-3 font-bold text-blue-600">{row.class_name}</td>
                          <td className="p-3 font-mono font-black text-slate-800 text-right">{row.total_score}</td>
                          <td className="p-3 font-mono font-black text-emerald-600 text-right">{row.average_score}</td>
                          <td className="p-3">
                            {row.isNameMismatch ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> ឈ្មោះមិនដូចគ្នា
                              </span>
                            ) : row.ceilingErrors.length > 0 ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">
                                ពិន្ទុលើសកម្រិត
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                                ត្រឹមត្រូវ
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Content: Warnings Tab */}
            {previewTab === 'warnings' && (
              <div className="space-y-3">
                {nameWarnings.map((w, idx) => (
                  <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-amber-900">
                        ⚠️ ភាពមិនស្របគ្នានៃឈ្មោះ៖ លេខតុ {w.desk_number} (ថ្នាក់ {w.class_name})
                      </p>
                      <p className="text-amber-700 mt-0.5">
                        ឈ្មោះក្នុង Excel: <strong>{w.excel_name}</strong> ↔ ឈ្មោះក្នុងប្រព័ន្ធ DB: <strong>{w.student_name}</strong>
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-amber-200/60 text-amber-900 font-black rounded-lg text-[10px]">
                      ផ្ទៀងផ្គងតាមលេខតុ
                    </span>
                  </div>
                ))}

                {ceilingViolations.map((v, idx) => (
                  <div key={idx} className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                    <p className="font-bold text-rose-900">
                      🚫 ពិន្ទុលើសកម្រិតកំណត់៖ {v.student_name} (ថ្នាក់ {v.class_name})
                    </p>
                    <ul className="text-rose-700 mt-1 list-disc list-inside">
                      {v.ceilingErrors.map((err, ei) => (
                        <li key={ei}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Content: Unmatched Tab */}
            {previewTab === 'unmatched' && (
              <div className="border border-rose-200 rounded-2xl overflow-hidden">
                <div className="bg-rose-50 p-3 font-bold text-xs text-rose-800 border-b border-rose-200">
                  សិស្សក្នុង Excel ដែលរកមិនឃើញក្នុងប្រព័ន្ធទិន្នន័យ
                </div>
                <div className="max-h-60 overflow-y-auto p-3 bg-white space-y-2 text-xs text-rose-700">
                  {unmatchedRows.map((r, i) => (
                    <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
                      <span>• ឈ្មោះ៖ <strong>{r.studentNameRaw || 'គ្មាន'}</strong> | អត្តលេខ៖ {r.studentIdNumber || 'គ្មាន'} | លេខតុ៖ {r.deskNumber || 'គ្មាន'}</span>
                      <span className="font-bold">ថ្នាក់៖ {r.className}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {(status === 'fetching' || status === 'parsing' || status === 'matching' || status === 'uploading') && (
           <div className="p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 text-sm font-bold flex items-center gap-3">
            <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
            <p>
              {status === 'fetching' && 'កំពុងទាញយកទិន្នន័យពី Google Sheet...'}
              {status === 'parsing' && 'កំពុងអាន និងផ្ទៀងផ្ទាត់ទិន្នន័យពី Excel...'}
              {status === 'matching' && 'កំពុងត្រួតពិនិត្យឈ្មោះសិស្ស និងកម្រិតពិន្ទុ MoEYS...'}
              {status === 'uploading' && 'កំពុងថតចម្លង Snapshot និងរក្សាទុកពិន្ទុក្នុងប្រព័ន្ធ...'}
            </p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          {status === 'preview' && (
            <button
              onClick={() => {
                setStatus('idle');
                setFile(null);
                setSheetUrl('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              ← ជ្រើសរើសឯកសារផ្សេង
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={status !== 'idle' && status !== 'error' && status !== 'success' && status !== 'preview'}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-sm disabled:opacity-50 cursor-pointer"
          >
            បិទ
          </button>
          {status === 'preview' ? (
             <button
               onClick={confirmUpload}
               className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center gap-2 cursor-pointer"
             >
               <CheckCircle2 className="w-4 h-4" /> យល់ព្រមរក្សាទុក & បង្កើត Snapshot ({readyToUpload.length})
             </button>
          ) : (
             <button
               onClick={processFile}
               disabled={(!file && !sheetUrl) || (status !== 'idle' && status !== 'error')}
               className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
             >
               {status !== 'idle' && status !== 'error' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងដំណើរការ</>
               ) : (
                  <><Upload className="w-4 h-4" /> ទាញយក និងផ្ទៀងផ្ទាត់</>
               )}
             </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

