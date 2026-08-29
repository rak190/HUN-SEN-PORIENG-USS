'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, CheckCircle2, AlertCircle, Loader2, Save, Filter, UserCheck, ShieldCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { getAvailableStudentsForPool, saveExamCandidatePool } from '@/app/(dashboard)/admin/exam-rooms/actions';

interface CandidatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  currentPool: any[];
  onSuccess: (savedCount: number) => void;
}

export function CandidatePoolModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  currentPool,
  onSuccess
}: CandidatePoolModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Filters
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    // Initialize selected from current pool
    const initSet = new Set<string>();
    currentPool.forEach(c => initSet.add(c.student_id));
    setSelectedStudentIds(initSet);

    async function loadStudents() {
      setLoading(true);
      try {
        const data = await getAvailableStudentsForPool();
        setStudents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const filteredStudents = students.filter(s => {
    if (gradeFilter !== 'all' && String(s.grade) !== gradeFilter) return false;
    if (trackFilter !== 'all') {
      const t = (s.track || '').toLowerCase();
      if (trackFilter === 'science' && !t.includes('sci') && !s.class_name.includes('SC')) return false;
      if (trackFilter === 'social' && !t.includes('soc') && !s.class_name.includes('SS')) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matchName = s.full_name.toLowerCase().includes(q);
      const matchId = (s.student_id_number || '').includes(q);
      const matchClass = s.class_name.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchClass) return false;
    }
    return true;
  });

  const handleToggleStudent = (stdId: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(stdId)) {
      next.delete(stdId);
    } else {
      next.add(stdId);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach(s => next.add(s.student_id));
    setSelectedStudentIds(next);
  };

  const handleDeselectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach(s => next.delete(s.student_id));
    setSelectedStudentIds(next);
  };

  const handleSavePool = async () => {
    if (selectedStudentIds.size === 0) {
      if (!confirm('តើអ្នកពិតជាចង់កំណត់បញ្ជីបេក្ខជនជាទទេរ (០ នាក់) មែនទេ?')) return;
    }

    setSaving(true);
    try {
      const candidateItems = Array.from(selectedStudentIds).map(sId => {
        const std = students.find(s => s.student_id === sId) || currentPool.find(c => c.student_id === sId);
        return {
          student_id: sId,
          class_id: std?.class_id || '',
          candidate_status: 'registered'
        };
      });

      const res = await saveExamCandidatePool(eventId, candidateItems);
      onSuccess(res.count);
      onClose();
    } catch (err: any) {
      alert('កំហុសក្នុងការរក្សាទុកបញ្ជីបេក្ខជន៖ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      icon={
        <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
          <Users className="w-5 h-5" />
        </div>
      }
      title={`ជ្រើសរើសបញ្ជីបេក្ខជនប្រឡង (${eventTitle})`}
    >
      <div className="p-6 sm:p-8 space-y-5">
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          សូមជ្រើសរើសសិស្សដែលត្រូវចូលរួមប្រឡងក្នុងសម័យប្រឡងនេះ។ បញ្ជីបេក្ខជនដែលបានជ្រើសរើសនឹងត្រូវបានរក្សាទុកជាផ្លូវការ (Persisted Candidate Pool) សម្រាប់យកទៅបែងចែកកៅអីតាមបន្ទប់។
        </p>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-600">កម្រិតថ្នាក់</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="all">គ្រប់កម្រិតថ្នាក់ (៧ ដល់ ១២)</option>
              <option value="7">ថ្នាក់ទី ៧ (G7)</option>
              <option value="8">ថ្នាក់ទី ៨ (G8)</option>
              <option value="9">ថ្នាក់ទី ៩ (G9)</option>
              <option value="10">ថ្នាក់ទី ១០ (G10)</option>
              <option value="11">ថ្នាក់ទី ១១ (G11)</option>
              <option value="12">ថ្នាក់ទី ១២ (G12)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-600">ផ្នែក / Track</label>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
            >
              <option value="all">គ្រប់ផ្នែក (ទូទៅ / វិទ្យាសាស្ត្រ / សង្គម)</option>
              <option value="science">វិទ្យាសាស្ត្រពិត (Science Track)</option>
              <option value="social">វិទ្យាសាស្ត្រសង្គម (Social Science Track)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-600">ស្វែងរក</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ឈ្មោះ អត្តលេខ ឬ ថ្នាក់..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#155EEF]"
              />
            </div>
          </div>
        </div>

        {/* Selection Status & Action Buttons */}
        <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#155EEF]" />
            <span className="font-extrabold text-blue-950">
              បានជ្រើសរើស៖ <strong className="text-[#155EEF]">{selectedStudentIds.size} នាក់</strong> (ក្នុងតម្រងបច្ចុប្បន្ន: {filteredStudents.length} នាក់)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-800 border border-blue-200 rounded-lg font-black text-[11px] shadow-2xs cursor-pointer"
            >
              ជ្រើសរើសទាំងអស់ក្នុងតម្រង
            </button>
            <button
              type="button"
              onClick={handleDeselectAllFiltered}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-rose-700 border border-rose-200 rounded-lg font-black text-[11px] shadow-2xs cursor-pointer"
            >
              ដោះចេញទាំងអស់
            </button>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto shadow-2xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 font-bold text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> កំពុងទាញទិន្នន័យសិស្ស...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4 text-center w-12">ជ្រើសរើស</th>
                  <th className="py-2.5 px-3">ឈ្មោះបេក្ខជន</th>
                  <th className="py-2.5 px-3 text-center">ភេទ</th>
                  <th className="py-2.5 px-3">អត្តលេខ</th>
                  <th className="py-2.5 px-3 text-center">ថ្នាក់រៀន</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(std => {
                  const isChecked = selectedStudentIds.has(std.student_id);

                  return (
                    <tr
                      key={std.student_id}
                      onClick={() => handleToggleStudent(std.student_id)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                        isChecked ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by tr click
                          className="w-4 h-4 rounded text-[#155EEF] cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {std.full_name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                        {std.gender === 'female' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {std.student_id_number || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-black rounded-md text-[11px]">
                          {std.class_name}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                      រកមិនឃើញទិន្នន័យសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-xs cursor-pointer"
        >
          បោះបង់
        </button>
        <button
          type="button"
          onClick={handleSavePool}
          disabled={saving || loading}
          className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md shadow-blue-500/20 transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងរក្សាទុក...</>
          ) : (
            <><Save className="w-4 h-4" /> រក្សាទុកបញ្ជីបេក្ខជន ({selectedStudentIds.size} នាក់)</>
          )}
        </button>
      </div>
    </Modal>
  );
}
