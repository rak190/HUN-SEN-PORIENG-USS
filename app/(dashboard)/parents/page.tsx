'use client';

import React, { useEffect, useState } from 'react';
import { Phone, Plus, Copy, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

interface ContactRow { id: string; student_id: string; contact_type: string; contacted_at: string; outcome: string; agreement?: string | null; follow_up_at?: string | null; students?: { full_name: string; guardian_phone?: string | null; alternative_phone?: string | null } | null }

export default function ParentsPage() {
  const { activeClass, user, isDemoMode } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const requestedStudent = searchParams.get('student');
  const [toastMessage, setToastMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [form, setForm] = useState({ studentId: '', type: 'call', outcome: '', agreement: '', followUp: '' });
  const [activeTab, setActiveTab] = useState<'history' | 'templates' | 'followups'>('history');
  const templates = [
    { title: 'អញ្ជើញប្រជុំ', text: 'សូមជម្រាបសួរលោក/លោកស្រី។ គ្រូបន្ទុកថ្នាក់សូមអញ្ជើញមកពិភាក្សាអំពីការសិក្សា និងវត្តមានរបស់កូន។ សូមអរគុណ។' },
    { title: 'អវត្តមាន', text: 'សូមជម្រាបសួរលោក/លោកស្រី។ ថ្ងៃនេះកូនរបស់លោក/លោកស្រីបានអវត្តមាន។ សូមជួយបញ្ជាក់មូលហេតុ និងជំរុញឱ្យមករៀនទៀងទាត់។' },
    { title: 'ពិន្ទុត្រូវការកែលម្អ', text: 'សូមជម្រាបសួរ។ លទ្ធផលសិក្សារបស់កូនត្រូវការការយកចិត្តទុកដាក់បន្ថែម។ គ្រូសូមស្នើឱ្យចូលរួមថ្នាក់បំប៉ន និងតាមដានការងារផ្ទះ។' },
    { title: 'សរសើរ', text: 'សូមអបអរសាទរ។ កូនរបស់លោក/លោកស្រីមានវត្តមាន និងលទ្ធផលសិក្សាល្អប្រសើរ។ សូមបន្តលើកទឹកចិត្តកូន។' },
  ];

  useEffect(() => {
    if (isDemoMode || !activeClass) {
      setStudents([{ id: 'std-1', full_name: 'កែវ ច័ន្ទធីតា' }, { id: 'std-5', full_name: 'ទិត្យ វិសាល' }]);
      setContacts([{ id: 'contact-1', student_id: 'std-5', contact_type: 'call', contacted_at: new Date().toISOString(), outcome: 'បានណាត់ជួបអាណាព្យាបាល', agreement: 'តាមដានវត្តមានប្រចាំថ្ងៃ', students: { full_name: 'ទិត្យ វិសាល', guardian_phone: '012 345 678' } }]);
      return;
    }
    Promise.all([
      supabase.from('students').select('id, full_name').eq('class_id', activeClass.id).eq('is_active', true).order('full_name'),
      supabase.from('parent_contacts').select('*, students!inner(full_name, guardian_phone, alternative_phone, class_id)').eq('students.class_id', activeClass.id).order('contacted_at', { ascending: false }),
    ]).then(([studentResult, contactResult]) => { if (studentResult.data) setStudents(studentResult.data); if (contactResult.data) setContacts(contactResult.data as unknown as ContactRow[]); });
  }, [activeClass?.id, isDemoMode]);

  useEffect(() => {
    if (requestedStudent && students.some(student => student.id === requestedStudent)) {
      setForm(current => ({ ...current, studentId: requestedStudent }));
      setShowForm(true);
    }
  }, [requestedStudent, students]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const copyTemplate = async (text = templates[0].text) => {
    await navigator.clipboard.writeText(text);
    showToast('បានចម្លងសារគំរូជាភាសាខ្មែរ');
  };

  const saveContact = async () => {
    if (!form.studentId || !form.outcome.trim()) return alert('សូមជ្រើសសិស្ស និងបំពេញលទ្ធផលទំនាក់ទំនង។');
    const student = students.find((item) => item.id === form.studentId);
    const optimistic: ContactRow = { id: `contact-${Date.now()}`, student_id: form.studentId, contact_type: form.type, contacted_at: new Date().toISOString(), outcome: form.outcome, agreement: form.agreement, follow_up_at: form.followUp || null, students: { full_name: student?.full_name || 'សិស្ស' } };
    if (isDemoMode || !user) setContacts((current) => [optimistic, ...current]);
    else {
      const { data, error } = await supabase.from('parent_contacts').insert({ student_id: form.studentId, contact_type: form.type, outcome: form.outcome.trim(), agreement: form.agreement.trim() || null, follow_up_at: form.followUp || null, created_by: user.id }).select('*, students(full_name, guardian_phone, alternative_phone)').single();
      if (error) return alert(error.message);
      setContacts((current) => [data as unknown as ContactRow, ...current]);
    }
    setShowForm(false); setForm({ studentId: '', type: 'call', outcome: '', agreement: '', followUp: '' }); showToast('បានរក្សាទុកកំណត់ត្រាទំនាក់ទំនង');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-[#155EEF] rounded-xl shadow-sm">
              <Phone className="w-6 h-6" />
            </div>
            <span>ទំនាក់ទំនងមាតាបិតា</span>
          </h1>
          <p className="text-sm font-semibold text-[#64748B] mt-1.5">
            កត់ត្រាការសន្ទនា និងការប្រជុំដើម្បីងាយស្រួលក្នុងការតាមដាន។
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-gradient-to-r from-[#155EEF] to-blue-600 text-white font-black rounded-xl text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0">
            <Plus className="w-4 h-4" /> បន្ថែមកំណត់ត្រា
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/60 flex flex-wrap gap-4 bg-slate-50/50 backdrop-blur-md">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl">
            {[{ id: 'history', label: 'ប្រវត្តិទំនាក់ទំនង' }, { id: 'templates', label: 'សារគំរូ' }, { id: 'followups', label: 'ត្រូវតាមដាន' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTab === tab.id ? 'bg-white text-[#155EEF] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setForm(current => ({ ...current, type: 'meeting' })); setShowForm(true); }} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center gap-2 ml-auto transition-colors">
            <FileText className="w-4 h-4" /> កត់ត្រាការប្រជុំ
          </button>
        </div>
        
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="p-5">កាលបរិច្ឆេទ</th>
                  <th className="p-5">សិស្ស</th>
                  <th className="p-5">វិធីសាស្រ្ត</th>
                  <th className="p-5">លេខទូរស័ព្ទ</th>
                  <th className="p-5">ប្រធានបទ</th>
                  <th className="p-5 text-center">លទ្ធផល</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100/50">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/60 transition-colors duration-200">
                    <td className="p-5 text-slate-500">{new Date(contact.contacted_at).toLocaleDateString('km-KH')}</td>
                    <td className="p-5 text-slate-900 font-black">{contact.students?.full_name}</td>
                    <td className="p-5 text-slate-500">{contact.contact_type === 'call' ? 'ទូរស័ព្ទ' : contact.contact_type === 'message' ? 'សារ' : contact.contact_type === 'meeting' ? 'ប្រជុំ' : 'ចុះផ្ទះ'}</td>
                    <td className="p-5 font-mono text-slate-500">{contact.students?.guardian_phone || contact.students?.alternative_phone || '-'}</td>
                    <td className="p-5 text-slate-500">{contact.outcome}</td>
                    <td className="p-5 text-center">
                      <span className="bg-blue-50 border border-blue-100 text-[#155EEF] px-3 py-1.5 rounded-lg text-xs font-black">
                        {contact.agreement || 'តាមដាន'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'templates' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <button key={template.title} onClick={() => copyTemplate(template.text)} className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#155EEF] hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-slate-800 text-sm">{template.title}</span>
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <Copy className="w-4 h-4 text-slate-400 group-hover:text-[#155EEF] transition-colors" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed line-clamp-3">{template.text}</p>
              </button>
            ))}
          </div>
        )}
        
        {activeTab === 'followups' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="p-5">កាលកំណត់</th>
                  <th className="p-5">សិស្ស</th>
                  <th className="p-5">កិច្ចព្រមព្រៀង</th>
                  <th className="p-5">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 text-sm">
                {contacts.filter(contact => contact.follow_up_at).map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50/60 transition-colors duration-200">
                    <td className="p-5 font-black text-amber-700">{contact.follow_up_at}</td>
                    <td className="p-5 font-black">{contact.students?.full_name}</td>
                    <td className="p-5 font-bold text-slate-600">{contact.agreement || '-'}</td>
                    <td className="p-5">
                      <button onClick={() => { setForm({ studentId: contact.student_id, type: 'call', outcome: '', agreement: contact.agreement || '', followUp: '' }); setShowForm(true); }} className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-[#155EEF] text-[#155EEF] hover:text-white font-black text-xs transition-colors">
                        កត់ត្រាតាមដាន
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl scale-100 animate-slideUp" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#155EEF] rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                កំណត់ត្រាទំនាក់ទំនង
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 font-bold text-xl">
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">សិស្ស</label>
                <select value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer">
                  <option value="">ជ្រើសសិស្ស...</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">វិធីសាស្រ្ត</label>
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer">
                  <option value="call">ទូរស័ព្ទ</option>
                  <option value="message">សារ</option>
                  <option value="meeting">ប្រជុំ</option>
                  <option value="home_visit">ចុះផ្ទះ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">លទ្ធផលទំនាក់ទំនង</label>
                <textarea value={form.outcome} onChange={(event) => setForm({ ...form, outcome: event.target.value })} rows={3} placeholder="ពណ៌នាអំពីការសន្ទនា..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold resize-none focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">កិច្ចព្រមព្រៀង / ចំណាត់ការបន្ត</label>
                <textarea value={form.agreement} onChange={(event) => setForm({ ...form, agreement: event.target.value })} rows={2} placeholder="សកម្មភាពបន្ទាប់ពីការសន្ទនា..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold resize-none focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">កាលបរិច្ឆេទតាមដានបន្ទាប់ (បើមាន)</label>
                <input type="date" value={form.followUp} onChange={(event) => setForm({ ...form, followUp: event.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#155EEF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer" />
              </div>
            </div>

            <div className="pt-2">
              <button onClick={saveContact} className="w-full py-4 bg-gradient-to-r from-[#155EEF] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                រក្សាទុក
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900/90 backdrop-blur-sm text-white px-6 py-3.5 rounded-2xl shadow-2xl z-50 text-sm font-bold border border-white/10 animate-slideUp flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
