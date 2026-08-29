'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Save, Plus, CheckCircle2, AlertCircle, Loader2, Clock, BookOpen, Building2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { saveExamEvent, getAcademicYears, getExamRooms } from '@/app/(dashboard)/admin/exam-rooms/actions';

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
  const [title, setTitle] = useState(eventToEdit?.title || 'ការប្រឡងប្រចាំខែ មីនា');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [academicYearId, setAcademicYearId] = useState(eventToEdit?.academic_year_id || '');
  const [academicYearText, setAcademicYearText] = useState(eventToEdit?.academic_year || '២០២៥-២០២៦');
  const [period, setPeriod] = useState(eventToEdit?.period || 'mar');
  const [examDate, setExamDate] = useState(eventToEdit?.exam_date || 'ថ្ងៃទី៣០ ខែមីនា ឆ្នាំ២០២៦');
  const [subject, setSubject] = useState(eventToEdit?.subject || '');
  const [startTime, setStartTime] = useState(eventToEdit?.start_time || '07:30');
  const [endTime, setEndTime] = useState(eventToEdit?.end_time || '11:00');
  const [session, setSession] = useState(eventToEdit?.session || 'ព្រឹក');

  const [targetPerRoom, setTargetPerRoom] = useState(eventToEdit?.target_students_per_room || 25);
  const [distributionMethod, setDistributionMethod] = useState(eventToEdit?.distribution_method || 'fixed_capacity');
  const [studentOrdering, setStudentOrdering] = useState(eventToEdit?.student_ordering || 'name');
  const [mixingMode, setMixingMode] = useState(eventToEdit?.mixing_mode || 'keep_classes');

  // Physical Rooms for Room Pool selection
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set(eventToEdit?.selected_room_ids || []));

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    async function loadMeta() {
      try {
        const [years, rooms] = await Promise.all([
          getAcademicYears(),
          getExamRooms()
        ]);
        setAcademicYears(years);
        setAllRooms(rooms);

        if (!eventToEdit && years.length > 0) {
          const curYear = years.find((y: any) => y.is_current) || years[0];
          setAcademicYearId(curYear.id);
          setAcademicYearText(curYear.name);
        }

        if (!eventToEdit || !eventToEdit.selected_room_ids || eventToEdit.selected_room_ids.length === 0) {
          // Default select all active rooms
          setSelectedRoomIds(new Set(rooms.filter(r => r.is_active).map(r => r.id)));
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadMeta();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleRoom = (rId: string) => {
    const next = new Set(selectedRoomIds);
    if (next.has(rId)) next.delete(rId);
    else next.add(rId);
    setSelectedRoomIds(next);
  };

  const handleSelectAllRooms = () => {
    setSelectedRoomIds(new Set(allRooms.filter(r => r.is_active).map(r => r.id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('សូមបញ្ចូលចំណងជើងសម័យប្រឡង');
      return;
    }

    if (selectedRoomIds.size === 0) {
      setErrorMessage('សូមជ្រើសរើសបន្ទប់ប្រឡងយ៉ាងហោចណាស់ ១ បន្ទប់');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const yearObj = academicYears.find(y => y.id === academicYearId);
      const yearName = yearObj?.name || academicYearText;

      const saved = await saveExamEvent({
        id: eventToEdit?.id,
        title,
        academic_year_id: academicYearId || undefined,
        academic_year: yearName,
        period,
        exam_date: examDate,
        subject,
        start_time: startTime,
        end_time: endTime,
        session,
        target_students_per_room: parseInt(String(targetPerRoom), 10) || 25,
        distribution_method: distributionMethod,
        student_ordering: studentOrdering,
        mixing_mode: mixingMode,
        selected_room_ids: Array.from(selectedRoomIds)
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
      size="2xl"
      icon={
        <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
          <Calendar className="w-5 h-5" />
        </div>
      }
      title={eventToEdit ? 'កែប្រែព័ត៌មានសម័យប្រឡង' : 'បង្កើតសម័យប្រឡងថ្មី (New Exam Event)'}
    >
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 max-h-[80vh] overflow-y-auto">
        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">ចំណងជើងសម័យប្រឡង *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ឧ. ការប្រឡងប្រចាំខែ មីនា ថ្នាក់ទី៧-១២"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">ឆ្នាំសិក្សា (Academic Year)</label>
            <select
              value={academicYearId}
              onChange={(e) => {
                setAcademicYearId(e.target.value);
                const y = academicYears.find(ay => ay.id === e.target.value);
                if (y) setAcademicYearText(y.name);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(បច្ចុប្បន្ន)' : ''}</option>
              ))}
              {academicYears.length === 0 && (
                <option value="">{academicYearText}</option>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">ខែប្រឡង / រយៈពេល</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              {ACADEMIC_PERIODS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">កាលបរិច្ឆេទប្រឡង</label>
            <input
              type="text"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              placeholder="ថ្ងៃទី៣០ ខែមីនា ឆ្នាំ២០២៦"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">ពេលប្រឡង (Session)</label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="ព្រឹក">ពេលព្រឹក (Morning)</option>
              <option value="រសៀល">ពេលរសៀល (Afternoon)</option>
              <option value="ពេញមួយថ្ងៃ">ពេញមួយថ្ងៃ (Full Day)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">ម៉ោងប្រឡង</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="07:30"
                className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold text-center"
              />
              <span className="text-slate-400">-</span>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="11:00"
                className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold text-center"
              />
            </div>
          </div>
        </div>

        {/* Selected Room Pool Selection */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#155EEF]" />
              ជ្រើសរើសបន្ទប់ចូលរួមប្រឡង (Selected Room Pool: {selectedRoomIds.size} បន្ទប់)
            </label>
            <button
              type="button"
              onClick={handleSelectAllRooms}
              className="text-[11px] font-black text-[#155EEF] hover:underline cursor-pointer"
            >
              ជ្រើសរើសបន្ទប់សកម្មទាំងអស់
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-xs">
            {allRooms.map(r => {
              const isSelected = selectedRoomIds.has(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleToggleRoom(r.id)}
                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition-colors border cursor-pointer ${
                    isSelected
                      ? 'bg-[#155EEF] text-white border-[#155EEF]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  បន្ទប់ {r.room_number}
                </button>
              );
            })}
          </div>
        </div>

        {/* Allocation Strategy Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">វិធីសាស្ត្រចែកបន្ទប់</label>
            <select
              value={distributionMethod}
              onChange={(e) => setDistributionMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="fixed_capacity">Method A: ចំណុះកំណត់ថេរ (Fixed)</option>
              <option value="custom_capacity">Method B: ចំណុះតាមបន្ទប់ (Custom)</option>
              <option value="manual_split">Method C: កំណត់ Range (Manual)</option>
              <option value="auto_balanced">Method D: ចែកស្មើគ្នា (Balanced)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">ការតម្រៀបសិស្ស</label>
            <select
              value={studentOrdering}
              onChange={(e) => setStudentOrdering(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="name">តាមឈ្មោះខ្មែរ (A-Z)</option>
              <option value="desk_number">តាមលេខតុក្នុងថ្នាក់</option>
              <option value="student_id">តាមអត្តលេខសិស្ស</option>
              <option value="random">ច្របល់ចៃដន្យ (Random)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700">ការច្របល់ថ្នាក់</label>
            <select
              value={mixingMode}
              onChange={(e) => setMixingMode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="keep_classes">រក្សាជាក្រុមថ្នាក់ (Keep Classes)</option>
              <option value="mix_classes">ច្របល់ឆ្លាស់ថ្នាក់ (Mix Round-Robin)</option>
              <option value="balanced_classes">ចែកសមាមាត្រស្មើគ្នា (Balanced)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl text-xs cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md shadow-blue-500/20 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            រក្សាទុកសម័យប្រឡង
          </button>
        </div>
      </form>
    </Modal>
  );
}
