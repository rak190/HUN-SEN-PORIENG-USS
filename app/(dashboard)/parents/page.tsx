'use client';

import React, { useState } from 'react';
import { Phone, Plus, Copy, FileText } from 'lucide-react';

export default function ParentsPage() {
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
            <Phone className="w-8 h-8 text-[#155EEF]" />
            <span>ទំនាក់ទំនងមាតាបិតា / Parent Communication</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1">Keep call logs and meeting notes so teachers do not lose information in Telegram.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => showToast('Parent contact record added')} className="px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Contact Record
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex gap-3 bg-slate-50">
          <button onClick={() => showToast('Message copied: សូមអញ្ជើញមកជួបគ្រូបន្ទុកថ្នាក់...')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2">
            <Copy className="w-4 h-4" /> Copy Khmer Message Template
          </button>
          <button onClick={() => showToast('Meeting note form opened')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2">
            <FileText className="w-4 h-4" /> Add Meeting Note
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                <th className="p-4">កាលបរិច្ឆេទ / Date</th>
                <th className="p-4">សិស្ស / Student</th>
                <th className="p-4">វិធីសាស្រ្ត / Method</th>
                <th className="p-4">លេខទូរស័ព្ទ / Parent Phone</th>
                <th className="p-4">ប្រធានបទ / Topic</th>
                <th className="p-4 text-center">លទ្ធផល / Result</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="p-4 text-slate-500">2026-07-03</td>
                <td className="p-4 text-slate-900 font-black">Sok Dara</td>
                <td className="p-4 text-slate-500">Phone</td>
                <td className="p-4 font-mono text-slate-500">012 345 678</td>
                <td className="p-4 text-slate-500">Absence</td>
                <td className="p-4 text-center"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px]">Meeting planned</span></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-4 text-slate-500">2026-07-01</td>
                <td className="p-4 text-slate-900 font-black">Kim Sreynich</td>
                <td className="p-4 text-slate-500">Meeting</td>
                <td className="p-4 font-mono text-slate-500">097 555 100</td>
                <td className="p-4 text-slate-500">Study progress</td>
                <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px]">Completed</span></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-4 text-slate-500">2026-06-29</td>
                <td className="p-4 text-slate-900 font-black">Vann Rithy</td>
                <td className="p-4 text-slate-500">Phone</td>
                <td className="p-4 font-mono text-slate-500">015 888 333</td>
                <td className="p-4 text-slate-500">Late arrival</td>
                <td className="p-4 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px]">Monitoring</span></td>
              </tr>
            </tbody>
          </table>
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
