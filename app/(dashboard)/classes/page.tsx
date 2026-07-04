'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Classroom, Subject } from '@/types';
import {
  School,
  PlusCircle,
  CheckCircle2,
  BookOpen,
  Trash2,
  Users,
  Loader2,
  Sparkles,
  Layers,
  Search,
  CalendarCheck,
  FileEdit,
  ArrowUpRight,
  Plus
} from 'lucide-react';

const AVAILABLE_SUBJECTS: Subject[] = [
  { id: 'math', label: 'គណិតវិទ្យា (Mathematics)' },
  { id: 'khmer', label: 'ភាសាខ្មែរ (Khmer Literature)' },
  { id: 'physics', label: 'រូបវិទ្យា (Physics)' },
  { id: 'chemistry', label: 'គីមីវិទ្យា (Chemistry)' },
  { id: 'biology', label: 'ជីវវិទ្យា (Biology)' },
  { id: 'ict', label: 'ព័ត៌មានវិទ្យា (ICT)' },
  { id: 'english', label: 'ភាសាអង់គ្លេស (English)' },
  { id: 'history', label: 'ប្រវត្តិវិទ្យា (History)' },
  { id: 'geography', label: 'ភូមិវិទ្យា (Geography)' },
  { id: 'civics', label: 'សីលធម៌ ពលរដ្ឋវិជ្ជា (Civics)' },
];

export default function ClassesPage() {
  const { classes, activeClass, setActiveClass, refreshClasses, user, isDemoMode } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('12');
  const [selectedSubjIds, setSelectedSubjIds] = useState<string[]>(['math', 'khmer']);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  function toggleSubject(id: string) {
    if (selectedSubjIds.includes(id)) {
      setSelectedSubjIds(selectedSubjIds.filter(item => item !== id));
    } else {
      setSelectedSubjIds([...selectedSubjIds, id]);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const subjectsObj = AVAILABLE_SUBJECTS.filter(s => selectedSubjIds.includes(s.id));

    if (isDemoMode || !user) {
      setTimeout(() => {
        const newCls: Classroom = {
          id: `demo-cls-${Date.now()}`,
          school_id: 'main-school',
          teacher_id: 'demo-teacher-id',
          name: name.trim(),
          grade,
          subjects: subjectsObj,
          created_at: new Date().toISOString(),
        };
        setActiveClass(newCls);
        resetForm();
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const { data, error } = await supabase.from('classes').insert([
        {
          school_id: 'main-school',
          teacher_id: user.id,
          name: name.trim(),
          grade,
          subjects: subjectsObj,
        }
      ]).select().single();

      if (!error && data) {
        await refreshClasses();
        setActiveClass(data as Classroom);
      }
      resetForm();
    } catch (err) {
      console.error('Error creating class:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName('');
    setGrade('12');
    setSelectedSubjIds(['math', 'khmer']);
    setShowAddForm(false);
  }

  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Header: Title left, Search pill + Primary button right */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            ថ្នាក់រៀនរបស់ខ្ញុំ
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            គ្រប់គ្រងថ្នាក់រៀន មុខវិជ្ជាបង្រៀន និងកូនសិស្សរបស់អ្នក
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Pill */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកថ្នាក់រៀន..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full py-2.5 pl-11 pr-4 text-xs font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-2.5 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'បិទទម្រង់' : 'ថ្នាក់ថ្មី'}</span>
          </button>
        </div>
      </header>

      {/* Inline Create Form Card — Converted to clean White Card design */}
      {showAddForm && (
        <form onSubmit={handleCreateClass} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-lg space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold flex items-center gap-2 text-slate-800">
              <div className="w-8 h-8 rounded-full bg-[#FFCF59] text-yellow-950 flex items-center justify-center">
                <Plus className="w-4 h-4 font-black" />
              </div>
              <span>បង្កើតថ្នាក់រៀនថ្មីសម្រាប់ឆ្នាំសិក្សា 2025-2026</span>
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              បិទ ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ឈ្មោះថ្នាក់រៀន (Class Name)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ឧ. 12 ក ឬ 11 ខ"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-extrabold text-sm focus:outline-none focus:border-[#155EEF] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">កម្រិតថ្នាក់ (Grade Level)</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm focus:outline-none focus:border-[#155EEF] focus:bg-white transition-all cursor-pointer"
              >
                <option value="12">ថ្នាក់ទី 12 (Grade 12)</option>
                <option value="11">ថ្នាក់ទី 11 (Grade 11)</option>
                <option value="10">ថ្នាក់ទី 10 (Grade 10)</option>
                <option value="9">ថ្នាក់ទី 9 (Grade 9)</option>
                <option value="8">ថ្នាក់ទី 8 (Grade 8)</option>
                <option value="7">ថ្នាក់ទី 7 (Grade 7)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              មុខវិជ្ជាដែលអ្នកបង្រៀនក្នុងថ្នាក់នេះ (អាចជ្រើសរើសបានច្រើន)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {AVAILABLE_SUBJECTS.map((subj) => {
                const isChecked = selectedSubjIds.includes(subj.id);
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => toggleSubject(subj.id)}
                    className={`p-3 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between border cursor-pointer ${
                      isChecked
                        ? 'bg-[#FFCF59] text-yellow-950 border-yellow-400 font-extrabold shadow-sm shadow-yellow-500/10'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{subj.label.split(' ')[0]}</span>
                    {isChecked && <CheckCircle2 className="w-4 h-4 shrink-0 text-yellow-950" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-all cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>បង្កើតថ្នាក់</span>}
            </button>
          </div>
        </form>
      )}

      {/* Classes Grid matching reference UI style + interactive quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => {
          const isCurrent = activeClass?.id === cls.id;
          return (
            <div
              key={cls.id}
              className={`rounded-[24px] p-6 transition-all duration-300 border shadow-xs flex flex-col justify-between ${
                isCurrent
                  ? 'bg-white border-[#155EEF] ring-2 ring-[#155EEF]/20 shadow-md'
                  : 'bg-white border-slate-100/80 hover:border-slate-300 hover:-translate-y-1'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-2xs ${
                    isCurrent ? 'bg-[#FFCF59] text-yellow-950' : 'bg-blue-50 text-[#155EEF]'
                  }`}>
                    {cls.grade}
                  </div>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-[#155EEF] border border-blue-200 px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#155EEF]" />
                      <span>ថ្នាក់សកម្ម</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveClass(cls)}
                      className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-[#155EEF] hover:text-white text-xs font-extrabold text-slate-600 transition-all border border-slate-200/80 cursor-pointer"
                    >
                      ជ្រើសរើសជាថ្នាក់សកម្ម
                    </button>
                  )}
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-1">
                  ថ្នាក់ {cls.name}
                </h3>
                <p className="text-xs font-semibold text-[#64748B] mb-5">
                  កម្រិតថ្នាក់ទី {cls.grade} — វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង
                </p>

                {/* Subjects Tags */}
                <div className="space-y-2 mb-6">
                  <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">
                    មុខវិជ្ជាបង្រៀន៖
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cls.subjects?.map((sub, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200/80"
                      >
                        {sub.label.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                {/* Real-time stats row */}
                <div className="py-3 px-3.5 bg-slate-50 rounded-2xl border border-slate-100/80 flex items-center justify-between text-xs font-extrabold mb-4">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Users className="w-4 h-4 text-[#155EEF]" />
                    <span>សិស្សសរុប៖ 42 នាក់</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-bold">
                    <span>វត្តមាន 98%</span>
                  </div>
                </div>

                {/* 1-Click Interactive Quick Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href="/attendance"
                    className="py-2 rounded-xl bg-blue-50/80 hover:bg-[#155EEF] hover:text-white text-[#155EEF] font-bold text-[11px] text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>ស្រង់វត្តមាន</span>
                  </Link>
                  <Link
                    href="/grades"
                    className="py-2 rounded-xl bg-yellow-50 hover:bg-[#FFCF59] hover:text-yellow-950 text-yellow-900 font-bold text-[11px] text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>បញ្ចូលពិន្ទុ</span>
                  </Link>
                  <Link
                    href="/students"
                    className="py-2 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-700 font-bold text-[11px] text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>មើលសិស្ស</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
