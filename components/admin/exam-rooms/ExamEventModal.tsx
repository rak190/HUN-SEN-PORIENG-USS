'use client';

import React, { useState } from 'react';
import { Calendar, Save, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { saveExamEvent } from '@/app/(dashboard)/admin/exam-rooms/actions';

interface ExamEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (event: any) => void;
  eventToEdit?: any;
}

export function ExamEventModal({
  isOpen,
  onClose,
  onSuccess,
  eventToEdit
}: ExamEventModalProps) {
  const [title, setTitle] = useState(eventToEdit?.title || 'ការប្រឡងប្រចាំខែ មីនា ថ្នាក់ទី៧-១២');
  const [academicYear, setAcademicYear] = useState(eventToEdit?.academic_year || '២០២៥-២០២៦');
  const [period, setPeriod] = useState(eventToEdit?.period || 'mar');
  const [examDate, setExamDate] = useState(eventToEdit?.exam_date || 'ថ្ងៃទី៣០ ខែមីនា ឆ្នាំ២០២៦');
  const [targetPerRoom, setTargetPerRoom] = useState(eventToEdit?.target_students_per_room || 25);
  const [distributionMethod, setDistributionMethod] = useState(eventToEdit?.distribution_method || 'fixed_capacity');
  const [studentOrdering, setStudentOrdering] = useState(eventToEdit?.student_ordering || 'name');
  const [mixingMode, setMixingMode] = useState(eventToEdit?.mixing_mode || 'keep_classes');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('សូមបញ្ចូលចំណងជើងសម័យប្រឡង');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const saved = await saveExamEvent({
        id: eventToEdit?.id,
        title,
        academic_year: academicYear,
        period,
        exam_date: examDate,
        target_students_per_room: parseInt(String(targetPerRoom), 10) || 25,
        distribution_method: distributionMethod,
        student_ordering: studentOrdering,
        mixing_mode: mixingMode
      });
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'កំហុសក្នុងការរក្សាទុកសម័យប្រឡង');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={
        <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
          <Calendar className="w-5 h-5" />
        </div>
      }
      title={eventToEdit ? 'កែប្រែព័ត៌មានសម័យប្រឡង' : 'បង្កើតសម័យប្រឡងថ្មី (New Exam Event)'}
    >
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700">ចំណងជើងសម័យប្រឡង *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ឧ. ការប្រឡងប្រចាំខែ មីនា ថ្នាក់ទី៧-១២"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">ខែប្រឡង / រយៈពេល</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              {ACADEMIC_PERIODS.map(p => (
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">កាលបរិច្ឆេទប្រឡង (បង្ហាញលើក្បាលតារាង)</label>
            <input
              type="text"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              placeholder="ថ្ងៃទី៣០ ខែមីនា ឆ្នាំ២០២៦"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">ចំនួនសិស្សគោលដៅក្នុង ១ បន្ទប់ (Target Capacity)</label>
            <input
              type="number"
              min={10}
              max={50}
              value={targetPerRoom}
              onChange={(e) => setTargetPerRoom(parseInt(e.target.value, 10) || 25)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">វិធីសាស្ត្រចែកបន្ទប់</label>
            <select
              value={distributionMethod}
              onChange={(e) => setDistributionMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="fixed_capacity">Method A: ចំណុះកំណត់ថេរ (Fixed)</option>
              <option value="custom_capacity">Method B: ចំណុះតាមបន្ទប់ (Custom)</option>
              <option value="manual_split">Method C: កំណត់ Range (Manual)</option>
              <option value="auto_balanced">Method D: ចែកស្មើគ្នា (Balanced)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">ការតម្រៀបសិស្ស</label>
            <select
              value={studentOrdering}
              onChange={(e) => setStudentOrdering(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="name">តាមឈ្មោះខ្មែរ (A-Z)</option>
              <option value="desk_number">តាមលេខតុក្នុងថ្នាក់</option>
              <option value="student_id">តាមអត្តលេខសិស្ស</option>
              <option value="random">ច្របល់ចៃដន្យ (Random)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">ការច្របល់ថ្នាក់</label>
            <select
              value={mixingMode}
              onChange={(e) => setMixingMode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="keep_classes">រក្សាជាក្រុមថ្នាក់ (Keep Classes)</option>
              <option value="mix_classes">ច្របល់ឆ្លាស់ថ្នាក់ (Mix Round-Robin)</option>
              <option value="balanced_classes">ចែកសមាមាត្រស្មើគ្នា</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-xs cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md shadow-blue-500/20 transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងរក្សាទុក...</>
            ) : (
              <><Save className="w-4 h-4" /> រក្សាទុកសម័យប្រឡង</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
