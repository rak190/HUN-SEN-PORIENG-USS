'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Megaphone, Plus, Search, Calendar, CheckCircle2, Send, Loader2, Trash2 } from 'lucide-react';

export default function PrincipalAnnouncementsPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('គ្រូបង្រៀនទាំងអស់');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('announcements').insert([{
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        is_published: true,
        created_by: user?.id || null
      }]);

      if (error) throw error;

      setTitle('');
      setContent('');
      setShowNewModal(false);
      await fetchAnnouncements();
    } catch (err: any) {
      alert('កំហុសក្នុងការបង្កើតសេចក្តីជូនដំណឹង៖ ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('តើអ្នកពិតជាចង់លុបសេចក្តីជូនដំណឹងនេះមែនទេ?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert('កំហុសក្នុងការលុប៖ ' + err.message);
    }
  };

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            សេចក្តីជូនដំណឹង & ផ្សព្វផ្សាយព័ត៌មាន
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>ប្រព័ន្ធប្រកាសព័ត៌មាន៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {profile?.school_code || 'Porieng-2026'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Pill */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកចំណងជើង..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs"
            />
          </div>

          {/* New Announcement Button */}
          <button
            onClick={() => setShowNewModal(true)}
            className="px-5 py-2.5 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>បង្កើតសេចក្តីជូនដំណឹង</span>
          </button>
        </div>
      </header>

      {/* New Announcement Modal/Form Inline Card if shown */}
      {showNewModal && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-[24px] border-2 border-[#155EEF] shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#155EEF]" />
              <span>សរសេរសេចក្តីជូនដំណឹងថ្មី</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              បិទ
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 block mb-1">ចំណងជើងប្រកាស៖</label>
                <input
                  type="text"
                  required
                  placeholder="ឧទាហរណ៍៖ កិច្ចប្រជុំបន្ទាន់ ឬការប្រឡង..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-xs font-bold focus:outline-none focus:border-[#155EEF]"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">គោលដៅទទួលព័ត៌មាន៖</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-xs font-bold focus:outline-none focus:border-[#155EEF] bg-white cursor-pointer"
                >
                  <option value="គ្រូបង្រៀនទាំងអស់">គ្រូបង្រៀនទាំងអស់</option>
                  <option value="គ្រូបន្ទុកថ្នាក់ & សិស្សានុសិស្ស">គ្រូបន្ទុកថ្នាក់ & សិស្សានុសិស្ស</option>
                  <option value="សិស្សទូទាំងសាលា">សិស្សទូទាំងសាលា</option>
                  <option value="មាតាបិតា & អាណាព្យាបាល">មាតាបិតា & អាណាព្យាបាល</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1">ខ្លឹមសារលម្អិត៖</label>
              <textarea
                required
                rows={4}
                placeholder="សរសេរខ្លឹមសារលម្អិតនៅទីនេះ..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-xs font-semibold focus:outline-none focus:border-[#155EEF]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-5 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full bg-[#155EEF] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'កំពុងផ្សព្វផ្សាយ...' : 'ផ្សព្វផ្សាយឥឡូវនេះ'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Announcements List Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2 font-bold">
          <Loader2 className="w-6 h-6 animate-spin text-[#155EEF]" />
          <span>កំពុងទាញយកសេចក្តីជូនដំណឹង...</span>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 font-bold">
          មិនមានសេចក្តីជូនដំណឹងត្រូវបង្ហាញទេ។
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs hover:border-[#155EEF]/40 transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#155EEF] flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#64748B] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> 
                        {new Date(item.created_at).toLocaleDateString('km-KH', { dateStyle: 'medium' })}
                      </span>
                      <span>•</span>
                      <span>គោលដៅ៖ <strong className="text-slate-700">{item.target_audience || 'ទូទៅ'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-extrabold border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>បានផ្សព្វផ្សាយ</span>
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="លុបសេចក្តីជូនដំណឹង"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-700 leading-relaxed pl-1 sm:pl-11 whitespace-pre-wrap">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
