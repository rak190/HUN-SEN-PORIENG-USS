'use client';

import React, { useState } from 'react';
import { Camera, Plus, Save } from 'lucide-react';

export default function GiepEvidencePage() {
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
            <Camera className="w-8 h-8 text-[#155EEF]" />
            <span>GIEP/GEIP Evidence / ឯកសារគម្រោង</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1">Store activity photos, participant counts, and short outcomes for reporting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">ឯកសារសកម្មភាព / Activity Evidence</h3>
            <button onClick={() => showToast('Upload evidence dialog opened')} className="px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2">
              <Camera className="w-4 h-4" /> Upload Evidence
            </button>
          </div>
          <div className="overflow-x-auto">
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
                <tr className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500">2026-07-02</td>
                  <td className="p-4">Remedial Math Support</td>
                  <td className="p-4 text-center text-slate-500">12 students</td>
                  <td className="p-4 text-center text-slate-500">3 photos</td>
                  <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px]">Ready</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500">2026-06-25</td>
                  <td className="p-4">Parent Meeting</td>
                  <td className="p-4 text-center text-slate-500">18 parents</td>
                  <td className="p-4 text-center text-slate-500">2 photos</td>
                  <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px]">Ready</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500">2026-06-18</td>
                  <td className="p-4">Library Reading Activity</td>
                  <td className="p-4 text-center text-slate-500">42 students</td>
                  <td className="p-4 text-center text-rose-500">Need photo</td>
                  <td className="p-4 text-center"><span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-md text-[10px]">Missing</span></td>
                </tr>
              </tbody>
            </table>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Activity Name</label>
                <input type="text" defaultValue="Remedial Math Support" className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input type="date" defaultValue="2026-07-02" className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Participants</label>
                <input type="text" defaultValue="12 students" className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Related Class</label>
                <select className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none">
                  <option>10A</option>
                  <option>10B</option>
                  <option>All Grade 10</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Outcome / Result</label>
                <textarea rows={3} defaultValue="Students practiced basic algebra. Two weak students were assigned peer support." className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none resize-none"></textarea>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => showToast('GIEP/GEIP evidence saved')} className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Evidence
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
