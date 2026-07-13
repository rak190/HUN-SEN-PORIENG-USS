'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HeartHandshake, Plus, Save, Printer, Download, Search, Phone, Home, Users, CheckCircle2, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { RiskLevel, SupportCaseStatus } from '@/types';
import * as XLSX from 'xlsx';
import { useSearchParams } from 'next/navigation';

interface CaseRow {
  id: string;
  student_id: string;
  category: string;
  priority: RiskLevel;
  status: SupportCaseStatus;
  summary: string;
  next_follow_up_at?: string | null;
  students?: { full_name: string; guardian_phone?: string | null } | null;
  support_interventions?: Array<{ id: string; action_type: string; action_date: string; notes: string; outcome?: string | null; follow_up_at?: string | null }>;
}

const DEMO_CASES: CaseRow[] = [
  { id: 'case-1', student_id: 'std-5', category: 'attendance', priority: 'high', status: 'open', summary: 'អវត្តមានញឹកញាប់ និងជួយការងារគ្រួសារ', next_follow_up_at: '2026-07-10', students: { full_name: 'ទិត្យ វិសាល', guardian_phone: '012 345 678' } },
  { id: 'case-2', student_id: 'std-3', category: 'achievement', priority: 'medium', status: 'monitoring', summary: 'ពិន្ទុគណិតវិទ្យាទាប', students: { full_name: 'ចាន់ សុភាព', guardian_phone: '097 222 111' } },
];

const CATEGORY_LABEL: Record<string, string> = {
  attendance: 'វត្តមាន', achievement: 'ការសិក្សា', discipline: 'វិន័យ', health: 'សុខភាព', family: 'គ្រួសារ/ជីវភាព', dropout_risk: 'ហានិភ័យបោះបង់',
};

export default function SupportPage() {
  const { activeClass, profile, user, isDemoMode } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const requestedStudent = searchParams.get('student');
  const requestedCategory = searchParams.get('category');
  const handledRequest = useRef('');
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState('');
  const [caseForm, setCaseForm] = useState({ studentId: '', category: 'attendance', priority: 'medium' as RiskLevel, summary: '', followUp: '' });
  const [followUp, setFollowUp] = useState({ actionType: 'note', notes: '', outcome: '', date: new Date().toISOString().slice(0, 10) });

  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 2800); };

  const loadData = async () => {
    if (isDemoMode || !activeClass) {
      setCases(DEMO_CASES);
      setStudents(DEMO_CASES.map((item) => ({ id: item.student_id, full_name: item.students?.full_name || 'សិស្ស' })));
      setSelectedId((current) => current || DEMO_CASES[0].id);
      return;
    }
    const [caseResult, studentResult] = await Promise.all([
      supabase.from('support_cases').select('*, students(full_name, guardian_phone), support_interventions(id, action_type, action_date, notes, outcome, follow_up_at)').eq('class_id', activeClass.id).order('updated_at', { ascending: false }),
      supabase.from('students').select('id, full_name').eq('class_id', activeClass.id).eq('is_active', true).order('full_name'),
    ]);
    if (caseResult.data) setCases(caseResult.data as unknown as CaseRow[]);
    if (studentResult.data) setStudents(studentResult.data);
    if (caseResult.data?.length) setSelectedId((current) => current || caseResult.data[0].id);
  };

  useEffect(() => { void loadData(); }, [activeClass?.id, isDemoMode]);
  useEffect(() => {
    const requestKey = `${requestedStudent || ''}:${requestedCategory || ''}`;
    if (requestKey === handledRequest.current) return;
    if (requestedStudent && students.some(student => student.id === requestedStudent)) {
      const existing = cases.find(item => item.student_id === requestedStudent && item.status !== 'resolved');
      if (existing) setSelectedId(existing.id);
      else {
        const category = requestedCategory && CATEGORY_LABEL[requestedCategory] ? requestedCategory : 'attendance';
        setCaseForm(current => ({ ...current, studentId: requestedStudent, category }));
        setShowNew(true);
      }
      handledRequest.current = requestKey;
    }
  }, [requestedStudent, requestedCategory, students, cases]);

  const filtered = useMemo(() => cases.filter((item) => (item.students?.full_name || '').includes(search) || item.summary.includes(search)), [cases, search]);
  const selectedCase = cases.find((item) => item.id === selectedId) || null;

  const createCase = async () => {
    if (!caseForm.studentId || !caseForm.summary.trim()) return alert('សូមជ្រើសសិស្ស និងបំពេញសេចក្តីសង្ខេប។');
    const student = students.find((item) => item.id === caseForm.studentId);
    const optimistic: CaseRow = { id: `case-${Date.now()}`, student_id: caseForm.studentId, category: caseForm.category, priority: caseForm.priority, status: 'open', summary: caseForm.summary.trim(), next_follow_up_at: caseForm.followUp || null, students: { full_name: student?.full_name || 'សិស្ស' } };
    if (isDemoMode || !activeClass || !user) {
      setCases((current) => [optimistic, ...current]); setSelectedId(optimistic.id); setShowNew(false); return notify('បានបង្កើតករណីគាំទ្រ។');
    }
    const { data, error } = await supabase.from('support_cases').insert({
      school_id: profile?.school_id, class_id: activeClass.id, student_id: caseForm.studentId, opened_by: user.id, assigned_to: user.id,
      category: caseForm.category, priority: caseForm.priority, summary: caseForm.summary.trim(), next_follow_up_at: caseForm.followUp || null,
    }).select('*, students(full_name, guardian_phone)').single();
    if (error) return alert(error.message);
    setCases((current) => [data as unknown as CaseRow, ...current]); setSelectedId(data.id); setShowNew(false); notify('បានបង្កើតករណីគាំទ្រ។');
  };

  const addIntervention = async (actionType = followUp.actionType) => {
    if (!selectedCase || !followUp.notes.trim()) return alert('សូមបំពេញកំណត់ត្រាសកម្មភាព។');
    if (!isDemoMode && user) {
      const { data: intervention, error } = await supabase.from('support_interventions').insert({ case_id: selectedCase.id, action_type: actionType, action_date: followUp.date, notes: followUp.notes.trim(), outcome: followUp.outcome || null, created_by: user.id }).select('id, action_type, action_date, notes, outcome, follow_up_at').single();
      if (error) return alert(error.message);
      await supabase.from('support_cases').update({ status: 'monitoring', updated_at: new Date().toISOString() }).eq('id', selectedCase.id);
      setCases((current) => current.map((item) => item.id === selectedCase.id ? { ...item, status: 'monitoring', support_interventions: [intervention, ...(item.support_interventions || [])] } : item));
    } else {
      const intervention = { id: `intervention-${Date.now()}`, action_type: actionType, action_date: followUp.date, notes: followUp.notes.trim(), outcome: followUp.outcome || null };
      setCases((current) => current.map((item) => item.id === selectedCase.id ? { ...item, status: 'monitoring', support_interventions: [intervention, ...(item.support_interventions || [])] } : item));
    }
    setFollowUp({ actionType: 'note', notes: '', outcome: '', date: new Date().toISOString().slice(0, 10) });
    notify('បានរក្សាទុកសកម្មភាពតាមដាន។');
  };

  const toggleResolved = async () => {
    if (!selectedCase) return;
    const status: SupportCaseStatus = selectedCase.status === 'resolved' ? 'monitoring' : 'resolved';
    if (!isDemoMode) {
      const { error } = await supabase.from('support_cases').update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', selectedCase.id);
      if (error) return alert(error.message);
    }
    setCases((current) => current.map((item) => item.id === selectedCase.id ? { ...item, status } : item));
  };

  const quickAction = (actionType: string, label: string) => {
    setFollowUp((current) => ({ ...current, actionType, notes: `${label}: ` }));
    document.getElementById('follow-up-note')?.focus();
  };

  const exportCases = () => {
    const sheet = XLSX.utils.json_to_sheet(cases.map((item) => ({ សិស្ស: item.students?.full_name, ប្រភេទ: CATEGORY_LABEL[item.category], អាទិភាព: item.priority, ស្ថានភាព: item.status, សេចក្តីសង្ខេប: item.summary, តាមដានបន្ទាប់: item.next_follow_up_at || '' })));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Support Cases'); XLSX.writeFile(book, `Support_Cases_${activeClass?.name || 'Class'}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-[#155EEF] rounded-xl shadow-sm">
              <HeartHandshake className="w-6 h-6" />
            </div>
            ការជួយគាំទ្រសិស្ស
          </h1>
          <p className="text-sm font-semibold text-[#64748B] mt-1.5">
            ប្រវត្តិតែមួយសម្រាប់វត្តមាន ការសិក្សា វិន័យ សុខភាព គ្រួសារ និងហានិភ័យបោះបង់
          </p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={exportCases} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition-colors border border-slate-200 cursor-pointer shadow-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#155EEF] to-blue-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-0.5">
            <Printer className="w-4 h-4" /> បោះពុម្ព
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Support Cases List */}
        <div className="lg:col-span-3 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/60 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50 backdrop-blur-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ស្វែងរកសិស្ស ឬបញ្ហា..." className="w-full bg-white border border-slate-200/80 rounded-2xl py-2.5 pl-11 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-sm transition-shadow" />
            </div>
            <button onClick={() => setShowNew(true)} className="px-5 py-2.5 bg-gradient-to-r from-[#155EEF] to-blue-600 text-white font-black rounded-xl text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0">
              <Plus className="w-4 h-4" /> បង្កើតករណី
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="p-5">សិស្ស</th>
                  <th className="p-5">បញ្ហា</th>
                  <th className="p-5">អាទិភាព</th>
                  <th className="p-5">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 text-sm">
                {filtered.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`cursor-pointer transition-colors duration-200 ${selectedId === item.id ? 'bg-blue-50/60' : 'hover:bg-slate-50/60'}`}>
                    <td className="p-5 font-black text-slate-800">{item.students?.full_name}</td>
                    <td className="p-5">
                      <div className="font-bold text-slate-700">{CATEGORY_LABEL[item.category]}</div>
                      <div className="text-xs text-slate-500 mt-1 max-w-[220px] truncate">{item.summary}</div>
                    </td>
                    <td className="p-5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-black ${item.priority === 'high' ? 'bg-rose-100 text-rose-700' : item.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="p-5 font-black text-slate-600">
                      <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${item.status === 'open' ? 'bg-amber-500' : item.status === 'monitoring' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                         <span className="capitalize">{item.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 font-bold">
                      រកមិនឃើញករណីគាំទ្រ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Case Detail */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/60 bg-slate-50/50 backdrop-blur-md flex items-center justify-between">
            <h3 className="font-bold text-slate-800">កំណត់ត្រាតាមដាន</h3>
            {selectedCase && (
              <button onClick={toggleResolved} className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors ${selectedCase.status === 'resolved' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                {selectedCase.status === 'resolved' ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {selectedCase.status === 'resolved' ? 'បើកឡើងវិញ' : 'បិទករណី'}
              </button>
            )}
          </div>
          <div className="p-6 space-y-6">
            {selectedCase ? (
              <>
                {/* Case Info */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="font-black text-lg text-slate-900">{selectedCase.students?.full_name}</div>
                  <div className="text-sm font-bold text-slate-500 mt-1">{selectedCase.summary}</div>
                </div>

                {/* Interventions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">ប្រវត្តិសកម្មភាព</h4>
                  {selectedCase.support_interventions?.length ? (
                    <div className="max-h-56 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {[...selectedCase.support_interventions].sort((a, b) => b.action_date.localeCompare(a.action_date)).map(entry => (
                        <div key={entry.id} className="relative pl-4 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 last:before:bottom-auto last:before:h-full">
                          <div className="absolute left-[-4px] top-2 w-2.5 h-2.5 rounded-full bg-[#155EEF] shadow-[0_0_0_4px_white]" />
                          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center gap-2 mb-2">
                              <span className="text-xs font-black text-[#155EEF] px-2 py-1 bg-blue-50 rounded-lg">{entry.action_type}</span>
                              <span className="text-[11px] font-bold text-slate-400">{entry.action_date}</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">{entry.notes}</p>
                            {entry.outcome && (
                              <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">
                                លទ្ធផល៖ {entry.outcome}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-400 py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">មិនទាន់មានសកម្មភាពតាមដាន។</p>
                  )}
                </div>

                {/* Add Follow-up */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'ហៅទូរស័ព្ទ', type: 'parent_call', icon: Phone }, 
                      { label: 'កត់ប្រជុំ', type: 'parent_meeting', icon: Users }, 
                      { label: 'ចុះផ្ទះ', type: 'home_visit', icon: Home }
                    ].map(({ label, type, icon: Icon }) => (
                      <button key={label} onClick={() => quickAction(type, label)} className="p-3 bg-white border border-slate-200 hover:border-[#155EEF] hover:shadow-sm rounded-xl text-xs font-black text-slate-700 flex flex-col items-center gap-2 transition-all group">
                        <Icon className="w-5 h-5 text-slate-400 group-hover:text-[#155EEF] transition-colors" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select value={followUp.actionType} onChange={(e) => setFollowUp({ ...followUp, actionType: e.target.value })} className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer">
                      <option value="note">កំណត់ត្រាធម្មតា</option>
                      <option value="parent_call">ហៅអាណាព្យាបាល</option>
                      <option value="parent_meeting">ប្រជុំអាណាព្យាបាល</option>
                      <option value="home_visit">ចុះផ្ទះ</option>
                      <option value="remedial">ថ្នាក់បំប៉ន</option>
                      <option value="referral">បញ្ជូនបន្ត</option>
                    </select>
                    <input type="date" value={followUp.date} onChange={(e) => setFollowUp({ ...followUp, date: e.target.value })} className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer" />
                  </div>
                  
                  <textarea id="follow-up-note" value={followUp.notes} onChange={(e) => setFollowUp({ ...followUp, notes: e.target.value })} rows={3} placeholder="សកម្មភាពដែលបានធ្វើ (ឧ. បានទាក់ទងឪពុកសិស្ស...)" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold resize-none focus:outline-none focus:ring-2 focus:ring-[#155EEF] placeholder:text-slate-400" />
                  
                  <input value={followUp.outcome} onChange={(e) => setFollowUp({ ...followUp, outcome: e.target.value })} placeholder="លទ្ធផល / កិច្ចព្រមព្រៀង (បើមាន)..." className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#155EEF] placeholder:text-slate-400" />
                  
                  <button onClick={() => addIntervention()} className="w-full py-3.5 bg-gradient-to-r from-[#155EEF] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <Save className="w-4 h-4" /> រក្សាទុកការតាមដាន
                  </button>
                </div>
              </>
            ) : (
              <div className="py-24 text-center">
                <HeartHandshake className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">សូមជ្រើសរើសករណីគាំទ្រមួយ<br/>ពីតារាងខាងឆ្វេង</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Case Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl scale-100 animate-slideUp" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#155EEF] rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                បង្កើតករណីគាំទ្រថ្មី
              </h2>
              <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 font-bold text-xl">
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">ជ្រើសរើសសិស្ស</label>
                <select value={caseForm.studentId} onChange={(event) => setCaseForm({ ...caseForm, studentId: event.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer">
                  <option value="">ជ្រើសសិស្ស...</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">ប្រភេទបញ្ហា</label>
                  <select value={caseForm.category} onChange={(event) => setCaseForm({ ...caseForm, category: event.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer">
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">កម្រិតអាទិភាព</label>
                  <select value={caseForm.priority} onChange={(event) => setCaseForm({ ...caseForm, priority: event.target.value as RiskLevel })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer">
                    <option value="low">ទាប</option>
                    <option value="medium">មធ្យម</option>
                    <option value="high">ខ្ពស់ (បន្ទាន់)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">សេចក្តីសង្ខេបបញ្ហា</label>
                <textarea value={caseForm.summary} onChange={(event) => setCaseForm({ ...caseForm, summary: event.target.value })} rows={4} placeholder="ពណ៌នាអំពីបញ្ហារបស់សិស្ស..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold resize-none focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400" />
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">កាលបរិច្ឆេទតាមដានបន្ទាប់</label>
                <input type="date" value={caseForm.followUp} onChange={(event) => setCaseForm({ ...caseForm, followUp: event.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer" />
              </div>
            </div>
            
            <div className="pt-2">
              <button onClick={createCase} className="w-full py-4 bg-gradient-to-r from-[#155EEF] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <HeartHandshake className="w-5 h-5" /> បង្កើតករណី
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900/90 backdrop-blur-sm text-white px-6 py-3.5 rounded-2xl shadow-2xl z-50 text-sm font-bold border border-white/10 animate-slideUp flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
