'use client';

import React, { useState } from 'react';
import { HeartHandshake, Plus, Save } from 'lucide-react';

export default function SupportPage() {
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <HeartHandshake className="w-8 h-8 text-[#155EEF]" />
            <span>ការជួយគាំទ្រសិស្ស / Student Support</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1">Use this for absent, low score, family, discipline, and dropout-risk cases.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Cases List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">ករណីកំពុងគាំទ្រ / Support Cases</h3>
            <button onClick={() => showToast('New case form opened')} className="px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Case
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                  <th className="p-4">សិស្ស / Student</th>
                  <th className="p-4">បញ្ហា / Problem</th>
                  <th className="p-4">ផែនការ / Plan</th>
                  <th className="p-4 text-center">ស្ថានភាព / Status</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-4">Sok Dara</td>
                  <td className="p-4 text-slate-500">Frequent absence</td>
                  <td className="p-4 text-slate-500">Parent meeting + home visit</td>
                  <td className="p-4 text-center"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px]">Open</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4">Chan Mony</td>
                  <td className="p-4 text-slate-500">Low math score</td>
                  <td className="p-4 text-slate-500">Remedial class</td>
                  <td className="p-4 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px]">In progress</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4">Vann Rithy</td>
                  <td className="p-4 text-slate-500">Late to school</td>
                  <td className="p-4 text-slate-500">Teacher counseling</td>
                  <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px]">Improving</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Follow-up Note Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">បន្ថែមការតាមដាន / Add Follow-up Note</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student</label>
                <select className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none">
                  <option>Sok Dara</option>
                  <option>Chan Mony</option>
                  <option>Vann Rithy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Type</label>
                <select className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none">
                  <option>Attendance</option>
                  <option>Learning</option>
                  <option>Behavior</option>
                  <option>Family</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Date</label>
                <input type="date" defaultValue="2026-07-10" className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none">
                  <option>Open</option>
                  <option>In progress</option>
                  <option>Resolved</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Note</label>
                <textarea rows={4} placeholder="Write short note here..." className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none resize-none"></textarea>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => showToast('Follow-up note saved')} className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Follow-up
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
