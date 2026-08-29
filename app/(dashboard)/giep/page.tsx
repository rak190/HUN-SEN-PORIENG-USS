'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Plus, Save, Activity, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

interface EvidenceItem {
  id: string;
  date: string;
  activity: string;
  participants: string;
  evidence: string;
  status: string;
}

export default function GiepEvidencePage() {
  const { activeClass, user } = useAuth();
  const [toastMessage, setToastMessage] = useState('');
  const [activities, setActivities] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    participants: '',
    outcome: '',
  });

  const supabase = createClient();

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    async function loadEvidence() {
      if (!activeClass) {
        setActivities([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('class_id', activeClass.id)
          .eq('category', 'geip')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setActivities(data.map(d => ({
            id: d.id,
            date: d.created_at ? d.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            activity: d.title,
            participants: d.size || '-',
            evidence: d.file_url ? 'មានឯកសារភ្ជាប់' : 'គ្មានឯកសារ',
            status: d.status || 'Ready'
          })));
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.error('Error loading GEIP evidence:', err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }

    loadEvidence();
  }, [activeClass?.id]);

  const handleSaveEvidence = async () => {
    if (!form.name.trim()) return alert('សូមបញ្ចូលឈ្មោះសកម្មភាព');
    if (!activeClass || !user) return alert('សូមជ្រើសរើសថ្នាក់ជាមុនសិន');

    try {
      const { data, error } = await supabase.from('documents').insert({
        class_id: activeClass.id,
        uploader_id: user.id,
        title: form.name.trim(),
        type: 'activity_log',
        file_url: form.outcome.trim() || 'activity',
        size: form.participants.trim() || 'សិស្សក្នុងថ្នាក់',
        category: 'geip',
        status: 'approved'
      }).select().single();

      if (error) {
        console.error('Error saving GEIP evidence:', error);
        alert(`មានបញ្ហាក្នុងការរក្សាទុក (Error): ${error.message}`);
        return;
      }

      if (data) {
        setActivities(prev => [{
          id: data.id,
          date: form.date,
          activity: data.title,
          participants: data.size,
          evidence: 'បានរក្សាទុក',
          status: 'Ready'
        }, ...prev]);
        setForm({ name: '', date: new Date().toISOString().slice(0, 10), participants: '', outcome: '' });
        showToast('បានរក្សាទុកភស្តុតាងសកម្មភាព GEIP ដោយជោគជ័យ');
      }
    } catch (e: any) {
      console.error(e);
      alert(`មានបញ្ហាក្នុងការរក្សាទុក: ${e?.message || 'Error'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Camera className="w-8 h-8 text-[#155EEF]" />
            <span>GIEP/GEIP Evidence & Reports / គម្រោង GEIP</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1">គ្រប់គ្រងភស្តុតាងសកម្មភាព របាយការណ៍សាលារៀន ៣.១.៤ និងការតាមដានសុខភាព</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/giep/report"
            className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-black shadow-sm flex items-center gap-2 transition-all scale-[1.01]"
          >
            <Building2 className="w-4 h-4 text-[#155EEF]" />
            <span>របាយការណ៍សាលារៀន (School Summary)</span>
          </Link>
          <Link
            href="/health"
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-black shadow-sm flex items-center gap-2 transition-all scale-[1.01]"
          >
            <Activity className="w-4 h-4 text-rose-600" />
            <span>តេស្តភ្នែក & ត្រចៀក (៣.៣.១.៣)</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">ឯកសារសកម្មភាព / Activity Evidence</h3>
          </div>
          <div className="overflow-x-auto">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                មិនទាន់មានភស្តុតាងសកម្មភាពនៅឡើយទេ។ សូមបំពេញទម្រង់ខាងស្តាំដើម្បីបន្ថែម។
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                    <th className="p-4">កាលបរិច្ឆេទ / Date</th>
                    <th className="p-4">សកម្មភាព / Activity</th>
                    <th className="p-4 text-center">អ្នកចូលរួម / Participants</th>
                    <th className="p-4 text-center">ភស្តុតាង / Evidence</th>
                    <th className="p-4 text-center">ស្ថានភាព / Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
                  {activities.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-500">{item.date}</td>
                      <td className="p-4">{item.activity}</td>
                      <td className="p-4 text-center text-slate-500">{item.participants}</td>
                      <td className="p-4 text-center text-slate-500">{item.evidence}</td>
                      <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px]">{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Add Activity Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">បន្ថែមសកម្មភាព / Add Activity Evidence</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះសកម្មភាព / Activity Name</label>
                <input
                  type="text"
                  placeholder="ឧ. ថ្នាក់បំប៉នគណិតវិទ្យា, ប្រជុំអាណាព្យាបាល..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">កាលបរិច្ឆេទ / Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">អ្នកចូលរួម / Participants</label>
                <input
                  type="text"
                  placeholder="ឧ. សិស្ស ១៥ នាក់"
                  value={form.participants}
                  onChange={(e) => setForm({ ...form, participants: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">លទ្ធផល / Outcome / Notes</label>
                <textarea
                  rows={3}
                  placeholder="ពណ៌នាអំពីលទ្ធផលនៃការអនុវត្ត..."
                  value={form.outcome}
                  onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none resize-none"
                ></textarea>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleSaveEvidence}
                className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> រក្សាទុកភស្តុតាង
              </button>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
