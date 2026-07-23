'use client';

import React, { useState } from 'react';
import { 
  FileSpreadsheet, Download, Search, Filter, Calendar, BarChart3, 
  FileText, ArrowDownToLine, CheckCircle2
} from 'lucide-react';

export default function MoeysReportsPage() {
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [searchQuery, setSearchQuery] = useState('');

  const reportTemplates = [
    {
      id: 'REP-01',
      title: 'សរុបស្ថិតិសិស្សដើមឆ្នាំ',
      category: 'របាយការណ៍ដើមឆ្នាំ',
      description: 'ស្ថិតិសិស្សសរុប ស្រី កម្រិតថ្នាក់ និងប្រភេទសិស្ស (ថ្មី, ត្រួតថ្នាក់) សម្រាប់ផ្ញើទៅមន្ទីរអប់រំ។',
      lastUpdated: '10 តុលា 2025',
      type: 'Excel'
    },
    {
      id: 'REP-02',
      title: 'របាយការណ៍អវត្តមានប្រចាំខែ',
      category: 'របាយការណ៍ប្រចាំខែ',
      description: 'សរុបអវត្តមានសិស្ស និងគ្រូបង្រៀនប្រចាំខែនីមួយៗ តាមទម្រង់ក្រសួង។',
      lastUpdated: '01 វិច្ឆិកា 2025',
      type: 'Excel'
    },
    {
      id: 'REP-03',
      title: 'បញ្ជីរាយនាមសិស្សប្រលងឆមាសទី១',
      category: 'របាយការណ៍ឆមាស',
      description: 'តារាងឈ្មោះសិស្ស និងពិន្ទុសម្រាប់ការប្រលងឆមាសទី១ (ទម្រង់ PDF ផ្លូវការ)។',
      lastUpdated: '15 មករា 2026',
      type: 'PDF'
    },
    {
      id: 'REP-04',
      title: 'ស្ថិតិគ្រូបង្រៀន និងបុគ្គលិក',
      category: 'របាយការណ៍រដ្ឋបាល',
      description: 'ចំនួនគ្រូបង្រៀន បុគ្គលិកអប់រំ តាមកម្រិតវប្បធម៌ និងមុខវិជ្ជាឯកទេស។',
      lastUpdated: '20 តុលា 2025',
      type: 'Excel'
    }
  ];

  const filteredReports = reportTemplates.filter(rep => 
    rep.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    rep.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none max-w-6xl mx-auto pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-[#155EEF]" />
            របាយការណ៍ក្រសួង (MoEYS Reports)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            ទាញយករបាយការណ៍តាមស្ដង់ដារប្រព័ន្ធ SIS សម្រាប់ផ្ញើទៅមន្ទីរអប់រំ។
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="2025-2026">ឆ្នាំសិក្សា ២០២៥ - ២០២៦</option>
              <option value="2024-2025">ឆ្នាំសិក្សា ២០២៤ - ២០២៥</option>
            </select>
          </div>
          <button className="px-5 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" /> ទាញយកទាំងអស់
          </button>
        </div>
      </header>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-50 p-6 rounded-[24px] border border-indigo-100 shadow-sm">
          <h3 className="text-indigo-800 font-extrabold flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5" /> របាយការណ៍សរុប
          </h3>
          <div className="text-3xl font-black text-indigo-700">១២</div>
          <p className="text-xs text-indigo-600/80 font-bold mt-1">មានស្រាប់ក្នុងប្រព័ន្ធ</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-100 shadow-sm">
          <h3 className="text-emerald-800 font-extrabold flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5" /> ទាញយករួចរាល់
          </h3>
          <div className="text-3xl font-black text-emerald-700">០៨</div>
          <p className="text-xs text-emerald-600/80 font-bold mt-1">ក្នុងខែនេះ</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-[24px] border border-amber-100 shadow-sm">
          <h3 className="text-amber-800 font-extrabold flex items-center gap-2 mb-2">
            <Filter className="w-5 h-5" /> ទម្រង់របាយការណ៍
          </h3>
          <div className="text-3xl font-black text-amber-700">Excel / PDF</div>
          <p className="text-xs text-amber-600/80 font-bold mt-1">ស្ដង់ដារ SIS</p>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            បញ្ជីរបាយការណ៍ផ្លូវការ
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះរបាយការណ៍..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-2xl shrink-0 ${report.type === 'Excel' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {report.type === 'Excel' ? <FileSpreadsheet className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-extrabold text-slate-800 text-base">{report.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                      {report.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold mb-2">{report.description}</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                    <span>ប្រភេទ: <span className={report.type === 'Excel' ? 'text-emerald-600' : 'text-rose-600'}>{report.type}</span></span>
                    <span>អាប់ដេតចុងក្រោយ: {report.lastUpdated}</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">{report.category}</span>
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 flex md:flex-col justify-end gap-2 mt-4 md:mt-0">
                <button 
                  onClick={() => alert(`កំពុងទាញយក: ${report.title}`)}
                  className="px-4 py-2 bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
                >
                  <ArrowDownToLine className="w-4 h-4" /> ទាញយក
                </button>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-400 font-bold text-sm">មិនមានរបាយការណ៍ដែលត្រូវនឹងការស្វែងរកទេ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
