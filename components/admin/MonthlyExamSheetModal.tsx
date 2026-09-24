import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2, Sparkles, Send, ExternalLink, ShieldCheck, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { generateMonthlyExamWorkbook, EXAM_TABS_CONFIG } from '@/lib/monthly-sheet-generator';
import { generateLiveExamGoogleSheetAction } from '@/app/(dashboard)/admin/master-scores/actions';

interface MonthlyExamSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: string;
}

export function MonthlyExamSheetModal({ isOpen, onClose, selectedPeriod }: MonthlyExamSheetModalProps) {
  const [loading, setLoading] = useState(false);
  const [creatingLive, setCreatingLive] = useState(false);
  const [period, setPeriod] = useState(selectedPeriod || 'mar');
  const [academicYear, setAcademicYear] = useState('២០២៥-២០២៦');
  const [academicYearId, setAcademicYearId] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [readiness, setReadiness] = useState<Record<string, { total: number, seated: number }>>({});
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setGoogleUrl('');
      setIsSuccess(false);
      setErrorMessage('');
      fetchReadiness();
      
      supabase.from('academic_years').select('id, name').eq('is_active', true).single().then(({ data }) => {
        if (data) {
          setAcademicYear(data.name);
          setAcademicYearId(data.id);
        }
      });
    }
  }, [isOpen]);

  const fetchReadiness = async () => {
    setLoadingReadiness(true);
    try {
      const { data: dbClasses } = await supabase.from('classes').select('id, grade, track');
      const { data: dbEnrollments } = await supabase
        .from('student_enrollments')
        .select('class_id, room_number, desk_number')
        .eq('enrollment_status', 'active');
      
      const stats: Record<string, { total: number, seated: number }> = {};
      EXAM_TABS_CONFIG.forEach(t => {
        stats[t.sheetName] = { total: 0, seated: 0 };
      });

      if (dbClasses && dbEnrollments) {
        dbEnrollments.forEach(e => {
          const cls = dbClasses.find(c => c.id === e.class_id);
          if (!cls) return;
          
          EXAM_TABS_CONFIG.forEach(t => {
             const matchGrade = String(cls.grade) === t.grade;
             if (!matchGrade) return;
             let matchTrack = true;
             if (t.track) {
                const clsTrack = (cls.track || '').toLowerCase();
                if (t.track === 'science') {
                   matchTrack = clsTrack.includes('sci') || clsTrack.includes('ពិត');
                } else if (t.track === 'social') {
                   matchTrack = clsTrack.includes('soc') || clsTrack.includes('សង្គម');
                }
             }
             if (matchTrack) {
                stats[t.sheetName].total += 1;
                if (e.room_number && e.desk_number) {
                  stats[t.sheetName].seated += 1;
                }
             }
          });
        });
      }
      setReadiness(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReadiness(false);
    }
  };

  const currentPeriodObj = ACADEMIC_PERIODS.find(p => p.id === period) || ACADEMIC_PERIODS[0];

  const handleCreateLiveSheet = async () => {
    if (!academicYearId) {
      setErrorMessage('រកមិនឃើញឆ្នាំសិក្សាទេ។');
      return;
    }

    setCreatingLive(true);
    setErrorMessage('');
    setIsSuccess(false);
    setGoogleUrl('');

    try {
      const res = await generateLiveExamGoogleSheetAction(currentPeriodObj.label, academicYearId);
      if (!res.success) {
         throw new Error(res.error);
      }
      
      setGoogleUrl(res.url as string);
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'កំហុសក្នុងការបង្កើត Google Sheet');
    } finally {
      setCreatingLive(false);
    }
  };

  const handleGenerateAndDownload = async () => {
    setLoading(true);
    setErrorMessage('');
    setIsSuccess(false);
    setGoogleUrl('');

    try {
      // 1. Fetch all active classes
      const { data: dbClasses, error: classErr } = await supabase
        .from('classes')
        .select('id, name, grade, track')
        .order('grade', { ascending: true });

      if (classErr) throw classErr;

      // 2. Fetch all active students via student_enrollments
      const { data: dbEnrollments, error: stdErr } = await supabase
        .from('student_enrollments')
        .select(`
          id, class_id, desk_number, room_number,
          students!inner(id, student_id_number, full_name, gender, date_of_birth)
        `)
        .eq('enrollment_status', 'active');

      if (stdErr) throw stdErr;

      if (!dbEnrollments || dbEnrollments.length === 0) {
        throw new Error('មិនទាន់មានទិន្នន័យសិស្សក្នុងប្រព័ន្ធសម្រាប់បង្កើត Sheet នៅឡើយទេ។');
      }

      // Map to expected StudentRecord format
      const mappedStudents = dbEnrollments.map((e: any) => ({
        id: e.students.id,
        student_id_number: e.students.student_id_number,
        desk_number: e.desk_number,
        room_number: e.room_number,
        full_name: e.students.full_name,
        gender: e.students.gender,
        dob: e.students.date_of_birth,
        class_id: e.class_id
      }));

      // 3. Generate 8-Tab Exam Workbook
      const wb = generateMonthlyExamWorkbook(
        mappedStudents as any,
        dbClasses || [],
        currentPeriodObj.label,
        academicYear
      );

      // 4. Trigger download
      const fileName = `តារាងពិន្ទុប្រឡង${currentPeriodObj.label}_វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង_${academicYear}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'កំហុសក្នុងការបង្កើតឯកសារ Excel');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      icon={
        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      }
      title="បង្កើត Google Sheet ប្រឡងប្រចាំខែ (៨ Tabs ស្តង់ដារ MoEYS)"
    >
      <div className="p-6 sm:p-8 space-y-6">
        {!isSuccess && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            ប្រព័ន្ធនឹងបង្កើតឯកសារ Excel ដែលមាន **៨ Tabs តាមកម្រិតថ្នាក់** ដោយស្រង់ឈ្មោះសិស្ស លេខតុ និងក្បាលតារាងមុខវិជ្ជា MoEYS ជាស្រេច។ អ្នកអាចបង្កើតវាដោយផ្ទាល់ចូល Google Drive របស់អ្នកដោយចុច "បង្កើត Google Sheet"។
          </p>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm font-bold flex items-start gap-3 whitespace-pre-wrap">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {isSuccess && googleUrl && (
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm animate-in fade-in duration-300">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-emerald-800">Google Sheet ប្រឡងត្រូវបានបង្កើត និងរក្សាទុកក្នុង Google Drive រួចរាល់!</h3>
              <p className="text-sm font-medium text-emerald-600">ឯកសារនេះត្រូវបានដាក់ក្នុង Folder នៃ Google Drive របស់លោកគ្រូអ្នកគ្រូដោយស្វ័យប្រវត្តិ។</p>
              
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <a 
                  href={googleUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all text-sm flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  បើកមើល Google Sheet
                </a>
                <button
                  onClick={() => copyToClipboard(googleUrl)}
                  className="px-6 py-2.5 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-black rounded-xl shadow-sm transition-all text-sm flex items-center gap-2 cursor-pointer"
                >
                  {copySuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copySuccess ? 'បានចម្លង (Copied)' : 'ចម្លង Link ផ្ញើទៅ Telegram'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isSuccess && !googleUrl && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p>បានទាញយកឯកសារ Excel (.xlsx) ដោយជោគជ័យ!</p>
              <p className="text-xs mt-1 text-emerald-600 font-medium">សូមកុំភ្លេចយកវាទៅ upload ចូល Google Drive មុនផ្ញើទៅកាន់គ្រូបង្រៀន។</p>
            </div>
          </div>
        )}

        {creatingLive && (
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in duration-300">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm font-bold text-blue-800 text-center leading-relaxed">
              កំពុងបង្កើត Google Sheet ៨ Tabs ក្នុង Google Drive របស់ Admin...<br/>
              <span className="text-xs font-medium text-blue-600 text-opacity-80">សូមរង់ចាំ ២-៣ វិនាទី</span>
            </p>
          </div>
        )}

        {/* Form Controls */}
        {!isSuccess && !creatingLive && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">ខែប្រឡង / រយៈពេល</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
                >
                  {ACADEMIC_PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">ឆ្នាំសិក្សា</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="២០២៥-២០២៦"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
                />
              </div>
            </div>

            {/* 8-Tab Preview Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  រចនាសម្ព័ន្ធ ៨ Tabs ក្នុងឯកសារតែមួយ (Multi-Tab Template Layout):
                </label>
                {loadingReadiness && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXAM_TABS_CONFIG.map((t, i) => {
                  const stat = readiness[t.sheetName] || { total: 0, seated: 0 };
                  const isReady = stat.total > 0 && stat.seated === stat.total;
                  const hasMissing = stat.total > 0 && stat.seated < stat.total;
                  
                  return (
                    <div key={i} className={`p-3 border rounded-xl shadow-2xs ${hasMissing ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tab {i + 1}</span>
                          <p className={`font-extrabold text-xs ${hasMissing ? 'text-orange-900' : 'text-slate-800'}`}>{t.sheetName}</p>
                        </div>
                        {isReady && stat.total > 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : hasMissing ? (
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        )}
                      </div>
                      <div className="mt-2 text-[10px] font-semibold text-slate-600">
                        {stat.total === 0 ? 'គ្មានសិស្ស' : (
                          <span className={isReady ? 'text-emerald-700' : 'text-orange-700'}>
                            មានតុ {stat.seated}/{stat.total}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
        {!isSuccess && !creatingLive && (
          <button
            onClick={handleGenerateAndDownload}
            disabled={loading}
            className="px-5 py-2.5 text-slate-600 font-bold border border-slate-300 hover:bg-slate-200 bg-white rounded-xl transition-colors text-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            ទាញយកជា File .xlsx (Offline Backup)
          </button>
        )}
        
        {!isSuccess && !creatingLive && (
          <button
            onClick={handleCreateLiveSheet}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> 
            បង្កើត Google Sheet ដោយផ្ទាល់ (Direct to Google Drive)
          </button>
        )}

        {(isSuccess || creatingLive) && (
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-sm cursor-pointer"
          >
            បិទ (Close)
          </button>
        )}
      </div>
    </Modal>
  );
}
