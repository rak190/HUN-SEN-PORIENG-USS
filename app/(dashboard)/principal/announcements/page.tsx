'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Megaphone, Plus, Search, Calendar, CheckCircle2, Bell, MessageSquare, Send } from 'lucide-react';

export default function PrincipalAnnouncementsPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'កិច្ចប្រជុំត្រួតពិនិត្យគរុកោសល្យប្រចាំខែសីហា', date: '02 សីហា 2026', target: 'គ្រូបង្រៀនទាំងអស់', status: 'បានផ្សព្វផ្សាយ', content: 'សូមគោរពអញ្ជើញលោកគ្រូ អ្នកគ្រូទាំងអស់ចូលរួមកិច្ចប្រជុំប្រចាំខែនៅសាលប្រជុំធំ វេលាម៉ោង 08:00 ព្រឹក។' },
    { id: 2, title: 'ការរៀបចំប្រឡងឆមាសទី 1 ឆ្នាំសិក្សា 2025-2026', date: '28 កក្កដា 2026', target: 'គ្រូបន្ទុកថ្នាក់ & សិស្សានុសិស្ស', status: 'បានផ្សព្វផ្សាយ', content: 'សូមគ្រូបន្ទុកថ្នាក់ទាំងអស់ពិនិត្យបញ្ជីឈ្មោះសិស្ស និងកាលវិភាគប្រឡងឱ្យបានត្រឹមត្រូវ។' },
    { id: 3, title: 'គោលការណ៍ពង្រឹងវិន័យ និងការស្លៀកពាក់របស់សិស្ស', date: '15 កក្កដា 2026', target: 'សិស្សទូទាំងសាលា', status: 'បានផ្សព្វផ្សាយ', content: 'តម្រូវឱ្យសិស្សទាំងអស់ស្លៀកពាក់ឯកសណ្ឋានសាលាឱ្យបានត្រឹមត្រូវ និងគោរពពេលវេលាចូលរៀន។' },
  ]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setAnnouncements([
      { id: Date.now(), title, date: 'ថ្ងៃនេះ', target: 'គ្រូបង្រៀនទាំងអស់', status: 'បានផ្សព្វផ្សាយ', content },
      ...announcements
    ]);
    setTitle('');
    setContent('');
    setShowNewModal(false);
  };

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
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs"
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
            <div>
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
              <label className="text-xs font-extrabold text-slate-700 block mb-1">ខ្លឹមសារលម្អិត៖</label>
              <textarea
                required
                rows={3}
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
              className="px-6 py-2 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ផ្សព្វផ្សាយឥឡូវនេះ</span>
            </button>
          </div>
        </form>
      )}

      {/* Announcements List Grid */}
      <div className="space-y-4">
        {announcements.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs hover:border-[#155EEF]/40 transition-all space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#155EEF] flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#64748B] mt-0.5">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                    <span>•</span>
                    <span>គោលដៅ៖ <strong className="text-slate-700">{item.target}</strong></span>
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-extrabold border border-emerald-200/60 self-start sm:self-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{item.status}</span>
              </span>
            </div>

            <p className="text-sm font-medium text-slate-700 leading-relaxed pl-1 sm:pl-11">
              {item.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
