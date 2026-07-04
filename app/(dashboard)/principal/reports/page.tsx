'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BarChart3, Download, Calendar, TrendingUp, Award, Users, CheckCircle2 } from 'lucide-react';

export default function PrincipalReportsPage() {
  const { profile } = useAuth();
  const [selectedTerm, setSelectedTerm] = useState('sem1-2026');

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            របាយការណ៍ & ស្ថិតិសាលារៀន
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>វិភាគទិន្នន័យសម្រាប់៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {profile?.school_code || 'Porieng-2026'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Term Selector Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
            <Calendar className="w-4 h-4 text-[#FFCF59]" />
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="sem1-2026">ឆមាសទី 1 ឆ្នាំសិក្សា 2025-2026</option>
              <option value="sem2-2026">ឆមាសទី 2 ឆ្នាំសិក្សា 2025-2026</option>
              <option value="annual-2026">សរុបប្រចាំឆ្នាំសិក្សា</option>
            </select>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={() => alert('កំពុងទាញយករហាយការណ៍ PDF...')}
            className="px-5 py-2.5 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export របាយការណ៍ (PDF)</span>
          </button>
        </div>
      </header>

      {/* Analytics Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase">អត្រាវត្តមានសរុប</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs">+1.4%</span>
          </div>
          <div className="text-4xl font-black text-slate-800">96.8 %</div>
          <p className="text-xs font-semibold text-slate-500">កើនឡើងធៀបនឹងខែមុន (95.4%)</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase">មធ្យមភាគពិន្ទុសិស្ស (GPA)</span>
            <span className="p-2 rounded-xl bg-blue-50 text-[#155EEF] font-bold text-xs">កម្រិតល្អ</span>
          </div>
          <div className="text-4xl font-black text-[#155EEF]">3.42 / 4.0</div>
          <p className="text-xs font-semibold text-slate-500">សិស្សជាង 65% ទទួលបាននិទ្ទេស A ឬ B</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase">អត្រាបញ្ចប់កម្មវិធីសិក្សា</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 font-bold text-xs">ទាន់ពេល</span>
          </div>
          <div className="text-4xl font-black text-slate-800">94.5 %</div>
          <p className="text-xs font-semibold text-slate-500">គ្រូបង្រៀនអនុវត្តតាមកាលវិភាគបានយ៉ាងល្អ</p>
        </div>
      </div>

      {/* Detailed Grade Performance Breakdown Table */}
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#155EEF]" />
            <span>ការប្រៀបធៀបលទ្ធផលសិក្សាតាមកម្រិតថ្នាក់នីមួយៗ</span>
          </h3>
          <span className="text-xs font-extrabold text-[#64748B] bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            ទិន្នន័យផ្លូវការ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-4 px-6">កម្រិតថ្នាក់</th>
                <th className="py-4 px-6 text-center">ចំនួនថ្នាក់សរុប</th>
                <th className="py-4 px-6 text-center">សិស្សសរុប</th>
                <th className="py-4 px-6 text-center">អត្រាវត្តមាន</th>
                <th className="py-4 px-6 text-center">មធ្យមភាគពិន្ទុ</th>
                <th className="py-4 px-6 text-center">និទ្ទេស A & B (%)</th>
                <th className="py-4 px-6 text-right">វាយតម្លៃ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {[
                { grade: 'ថ្នាក់ទី 12', classes: 5, students: 145, att: '98.2%', gpa: '3.65', ab: '72.4%', eval: 'ល្អប្រសើរ' },
                { grade: 'ថ្នាក់ទី 11', classes: 5, students: 160, att: '96.5%', gpa: '3.40', ab: '64.0%', eval: 'ល្អ' },
                { grade: 'ថ្នាក់ទី 10', classes: 6, students: 185, att: '95.8%', gpa: '3.35', ab: '58.5%', eval: 'ល្អ' },
                { grade: 'ថ្នាក់ទី 9', classes: 6, students: 190, att: '96.0%', gpa: '3.28', ab: '55.0%', eval: 'មធ្យមល្អ' },
              ].map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-extrabold text-slate-800">{r.grade}</td>
                  <td className="py-4 px-6 text-center text-slate-600">{r.classes} ថ្នាក់</td>
                  <td className="py-4 px-6 text-center text-slate-800 font-bold">{r.students} នាក់</td>
                  <td className="py-4 px-6 text-center font-extrabold text-emerald-600">{r.att}</td>
                  <td className="py-4 px-6 text-center font-mono font-black text-[#155EEF]">{r.gpa}</td>
                  <td className="py-4 px-6 text-center font-bold text-slate-700">{r.ab}</td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#155EEF] text-xs font-bold border border-blue-100">
                      {r.eval}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
