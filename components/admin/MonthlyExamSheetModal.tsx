import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2, Sparkles, Send, ExternalLink, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { generateMonthlyExamWorkbook, EXAM_TABS_CONFIG } from '@/lib/monthly-sheet-generator';

interface MonthlyExamSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: string;
}

export function MonthlyExamSheetModal({ isOpen, onClose, selectedPeriod }: MonthlyExamSheetModalProps) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(selectedPeriod || 'mar');
  const [academicYear, setAcademicYear] = useState('២០២៥-២០២៦');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  if (!isOpen) return null;

  const currentPeriodObj = ACADEMIC_PERIODS.find(p => p.id === period) || ACADEMIC_PERIODS[0];

  const handleGenerateAndDownload = async () => {
    setLoading(true);
    setErrorMessage('');
    setIsSuccess(false);

    try {
      // 1. Fetch all active classes
      const { data: dbClasses, error: classErr } = await supabase
        .from('classes')
        .select('id, name, grade, track')
        .order('grade', { ascending: true });

      if (classErr) throw classErr;

      // 2. Fetch all active students with class information
      const { data: dbStudents, error: stdErr } = await supabase
        .from('students')
        .select('id, student_id_number, desk_number, room_number, full_name, gender, dob, class_id, classes(id, name, grade, track)')
        .eq('is_active', true);

      if (stdErr) throw stdErr;

      if (!dbStudents || dbStudents.length === 0) {
        throw new Error('មិនទាន់មានទិន្នន័យសិស្សក្នុងប្រព័ន្ធសម្រាប់បង្កើត Sheet នៅឡើយទេ។');
      }

      // 3. Generate 8-Tab Exam Workbook
      const wb = generateMonthlyExamWorkbook(
        dbStudents as any,
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
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          ប្រព័ន្ធនឹងបង្កើតឯកសារ Excel ដែលមាន **៨ Tabs តាមកម្រិតថ្នាក់** ដោយស្រង់ឈ្មោះសិស្ស លេខតុ និងក្បាលតារាងមុខវិជ្ជា MoEYS ជាស្រេច។ Admin គ្រាន់តែទាញយក ហើយយកទៅបើកលើ Google Drive រួច Copy Link ផ្ញើចូល Telegram ឱ្យលោកគ្រូអ្នកគ្រូបំពេញជាការស្រេច។
        </p>

        {errorMessage && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm font-bold flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {isSuccess && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p>បានបង្កើត និងទាញយកឯកសារ Excel ៨ Tabs ដោយជោគជ័យ!</p>
              <p className="text-xs mt-1 text-emerald-600 font-medium">អ្នកអាចយកឯកសារនេះទៅ Upload លើ Google Sheets ហើយ Copy Link ផ្ញើចូល Telegram របស់សាលា។</p>
            </div>
          </div>
        )}

        {/* Form Controls */}
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
          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            រចនាសម្ព័ន្ធ ៨ Tabs ក្នុងឯកសារតែមួយ (Multi-Tab Template Layout):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EXAM_TABS_CONFIG.map((t, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tab {i + 1}</span>
                  <p className="font-extrabold text-xs text-slate-800">{t.sheetName}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Telegram Guide */}
        <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs space-y-3">
          <p className="font-extrabold text-blue-900 flex items-center gap-1.5">
            🚀 របៀបយកឯកសារនេះទៅប្រើប្រាស់ក្នុង Telegram (៣ ជំហានលឿនរហ័ស):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-semibold text-slate-700">
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="font-black text-[#155EEF]">១. ទាញយកឯកសារ Excel</span>
              <p className="text-[11px] text-slate-500 mt-1">ចុចប៊ូតុងខាងក្រោមដើម្បីទាញយកឯកសារ ៨ Tabs ដែលមានស្រង់ឈ្មោះសិស្សរួចរាល់</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="font-black text-[#155EEF]">២. Upload លើ Google Drive</span>
              <p className="text-[11px] text-slate-500 mt-1">បើក Google Drive រួច Upload ឯកសារនេះ ហើយបើកជា Google Sheet</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="font-black text-[#155EEF]">៣. ផ្ញើ Link ចូល Telegram</span>
              <p className="text-[11px] text-slate-500 mt-1">កំណត់ Share ជា "Anyone with link" រួចផ្ញើតំណភ្ជាប់ចូល Telegram ឱ្យគ្រូបំពេញ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-sm disabled:opacity-50 cursor-pointer"
        >
          បិទ
        </button>
        <button
          onClick={handleGenerateAndDownload}
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងបង្កើតឯកសារ...</>
          ) : (
            <><Download className="w-4 h-4" /> ទាញយក Excel ៨ Tabs ផ្លូវការ</>
          )}
        </button>
      </div>
    </Modal>
  );
}
