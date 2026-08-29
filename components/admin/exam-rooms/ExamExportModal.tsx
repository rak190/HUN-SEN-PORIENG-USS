'use client';

import React, { useState } from 'react';
import { Download, Printer, FileSpreadsheet, CheckCircle2, AlertCircle, Layers, Sparkles, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '@/components/ui/Modal';
import { RoomDistribution } from '@/lib/exam-allocation-engine';
import { generateExamExcelWorkbook, generatePrintableRoomPosters, ExamExportOptions } from '@/lib/exam-export-engine';

interface ExamExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributions: RoomDistribution[];
  eventTitle: string;
  academicYear: string;
  examDate: string;
}

export function ExamExportModal({
  isOpen,
  onClose,
  distributions,
  eventTitle,
  academicYear,
  examDate
}: ExamExportModalProps) {
  const [selectedMode, setSelectedMode] = useState<'multi_grade_sections' | 'single_sheet' | 'one_sheet_per_room' | 'pdf_posters'>('multi_grade_sections');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const totalCandidates = distributions.reduce((sum, d) => sum + d.candidates.length, 0);

  const handleExport = () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      if (selectedMode === 'pdf_posters') {
        const html = generatePrintableRoomPosters(distributions, {
          mode: 'multi_grade_sections',
          eventTitle,
          academicYear,
          examDate
        });
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 400);
        }
        setIsExporting(false);
        setExportSuccess(true);
        return;
      }

      const options: ExamExportOptions = {
        mode: selectedMode,
        eventTitle,
        academicYear,
        examDate
      };

      const wb = generateExamExcelWorkbook(distributions, options);
      const modeSuffix = selectedMode === 'multi_grade_sections' ? 'តាមកម្រិតថ្នាក់_៨សន្លឹក' : (selectedMode === 'single_sheet' ? 'សរុប_១សន្លឹក' : 'តាមបន្ទប់នីមួយៗ');
      const filename = `បញ្ជីបេក្ខជនប្រឡង_${eventTitle}_${modeSuffix}_${academicYear}.xlsx`;

      XLSX.writeFile(wb, filename);
      setExportSuccess(true);
    } catch (e: any) {
      console.error(e);
      alert('កំហុសក្នុងការបង្កើតឯកសារ Export: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      icon={
        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs">
          <Download className="w-5 h-5" />
        </div>
      }
      title="ទាញយកបញ្ជីបេក្ខជន & បន្ទប់ប្រឡង (Export Official Candidate List)"
    >
      <div className="p-6 sm:p-8 space-y-6">
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          ជ្រើសរើសទម្រង់ឯកសារដែលលោកអ្នកចង់ទាញយកសម្រាប់ប្រើប្រាស់ជាផ្លូវការ ផ្ញើចូល Telegram ឬបោះពុម្ពបិទតាមទ្វារបន្ទប់ប្រឡង៖
        </p>

        {exportSuccess && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>បានទាញយកឯកសារដោយជោគជ័យ!</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Mode 2: Real School Multi-Grade */}
          <div
            onClick={() => setSelectedMode('multi_grade_sections')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              selectedMode === 'multi_grade_sections'
                ? 'border-[#155EEF] bg-blue-50/50 ring-2 ring-[#155EEF]/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedMode === 'multi_grade_sections' ? 'bg-[#155EEF] text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">ទម្រង់ស្តង់ដារសាលា ៨ សន្លឹក (G7, G8, G9, G10, G11 SC, G11SS, G12SC, G12SS)</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">ណែនាំបំផុត</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                បែងចែកជា ៨ សន្លឹកតាមកម្រិតថ្នាក់ ដោយក្នុងមួយសន្លឹកមានរៀបចំបន្ទប់ប្រឡងបន្តកន្ទុយគ្នា (Room 1, Room 2...) ត្រឹមត្រូវតាមលំនាំ Excel ជាក់ស្តែងរបស់សាលា។
              </p>
            </div>
          </div>

          {/* Mode 1: Single Sheet */}
          <div
            onClick={() => setSelectedMode('single_sheet')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              selectedMode === 'single_sheet'
                ? 'border-[#155EEF] bg-blue-50/50 ring-2 ring-[#155EEF]/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedMode === 'single_sheet' ? 'bg-[#155EEF] text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900">សន្លឹកសរុបរួមតែមួយ (Single Flat Sheet)</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                រៀបចំសិស្សទាំងអស់ទូទាំងសាលាក្នុងសន្លឹក Excel តែមួយបន្តកន្ទុយគ្នា ងាយស្រួល Filter ឬស្វែងរកតាមលេខតុ។
              </p>
            </div>
          </div>

          {/* Mode 3: One Sheet per Room */}
          <div
            onClick={() => setSelectedMode('one_sheet_per_room')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              selectedMode === 'one_sheet_per_room'
                ? 'border-[#155EEF] bg-blue-50/50 ring-2 ring-[#155EEF]/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedMode === 'one_sheet_per_room' ? 'bg-[#155EEF] text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900">មួយបន្ទប់ = មួយ Sheet ដាច់ដោយឡែក (One Tab per Room)</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                បង្កើត Tab Excel ដាច់ដោយឡែកសម្រាប់បន្ទប់នីមួយៗ (បន្ទប់ ១ ដល់ បន្ទប់ ៥៣)។
              </p>
            </div>
          </div>

          {/* Mode 4: Printable Door Posters */}
          <div
            onClick={() => setSelectedMode('pdf_posters')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              selectedMode === 'pdf_posters'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedMode === 'pdf_posters' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Printer className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900">បោះពុម្ពបិទតាមទ្វារបន្ទប់ប្រឡង (A4 Printable Posters)</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                រៀបចំជាទំព័រ A4 (១ បន្ទប់ = ១ ទំព័រ) មានក្បាលលិខិតផ្លូវការ និងតារាងឈ្មោះបេក្ខជន សម្រាប់បោះពុម្ពជាក្រដាសភ្លាមៗ។
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>ចំនួនបន្ទប់សរុប៖ <strong className="text-slate-900">{distributions.length} បន្ទប់</strong></span>
          <span>ចំនួនបេក្ខជនសរុប៖ <strong className="text-slate-900">{totalCandidates} នាក់</strong></span>
          <span>លេខតុបន្តបន្ទាប់៖ <strong className="text-slate-900">{distributions[0]?.startOrder || 1} ដល់ {distributions[distributions.length-1]?.endOrder || totalCandidates}</strong></span>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-sm cursor-pointer"
        >
          បិទ
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {selectedMode === 'pdf_posters' ? (
            <><Printer className="w-4 h-4" /> បោះពុម្ពជា PDF / Posters</>
          ) : (
            <><Download className="w-4 h-4" /> ទាញយកឯកសារ Excel</>
          )}
        </button>
      </div>
    </Modal>
  );
}
