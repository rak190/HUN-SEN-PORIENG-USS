'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, AlertCircle, Search, 
  Filter, CheckCircle2, Clock, Check,
  Upload, Send, Building2, Download
} from 'lucide-react';
import { MasterScoreUploadModal } from '@/components/admin/MasterScoreUploadModal';
import { MasterScoreRollbackModal } from '@/components/admin/MasterScoreRollbackModal';
import { MonthlyExamSheetModal } from '@/components/admin/MonthlyExamSheetModal';
import { GEIPExportModal } from '@/components/admin/GEIPExportModal';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { calculateSummaryScores } from './actions';
import { RotateCcw, History } from 'lucide-react';

export default function MasterScoresPage() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [classesStatus, setClassesStatus] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [draftCount, setDraftCount] = useState(0);
  const [publishedClassesCount, setPublishedClassesCount] = useState(0);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [isMonthlyExamSheetModalOpen, setIsMonthlyExamSheetModalOpen] = useState(false);
  const [isGEIPExportModalOpen, setIsGEIPExportModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const curMonth = new Date().getMonth();
    const monthIds = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    setSelectedPeriod(monthIds[curMonth]);
  }, []);

  const todayStr = new Date().toLocaleDateString('km-KH', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!selectedPeriod) return;
    
    async function fetchStats() {
      setLoading(true);
      try {
        // 1. Fetch all classes
        const { data: classesData, error: classErr } = await supabase
          .from('classes')
          .select('id, name, teacher_id, profiles:teacher_id(full_name)')
          .order('name', { ascending: true });

        if (classErr) throw classErr;

        // 2. Fetch distinct grades for this period
        const { data: gradesData, error: gradeErr } = await supabase
          .from('grades')
          .select('class_id, status')
          .eq('period', selectedPeriod);

        if (gradeErr) throw gradeErr;

        const classMap = new Map<string, { hasDraft: boolean; hasPublished: boolean }>();
        gradesData.forEach((g: any) => {
          const current = classMap.get(g.class_id) || { hasDraft: false, hasPublished: false };
          if (g.status === 'draft') current.hasDraft = true;
          if (g.status === 'published') current.hasPublished = true;
          classMap.set(g.class_id, current);
        });

        let drafts = 0;
        let published = 0;

        const statusList = (classesData || []).map((c: any) => {
          const stat = classMap.get(c.id);
          let finalStatus = 'missing'; // default
          if (stat?.hasDraft) {
            finalStatus = 'draft';
            drafts++;
          } else if (stat?.hasPublished) {
            finalStatus = 'published';
            published++;
          }
          return {
            id: c.id,
            name: c.name,
            teacher: c.profiles?.full_name || 'មិនទាន់មាន',
            status: finalStatus
          };
        });

        setClassesStatus(statusList);
        setDraftCount(drafts);
        setPublishedClassesCount(published);
      } catch (err) {
        console.error("Error fetching master score stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [selectedPeriod]);

  const handlePublishScores = async () => {
    if (!confirm(`តើអ្នកពិតជាចង់បោះពុម្ពផ្សាយពិន្ទុសម្រាប់ខែ "${selectedPeriod}" មែនទេ?`)) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('grades')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('period', selectedPeriod)
        .eq('status', 'draft');

      if (error) throw error;
      alert('បានបោះពុម្ពផ្សាយពិន្ទុជោគជ័យ!');
      // Trigger refetch
      setSelectedPeriod(selectedPeriod + ' ');
      setTimeout(() => setSelectedPeriod(selectedPeriod.trim()), 100);
    } catch (err: any) {
      alert('កំហុសក្នុងការបោះពុម្ពផ្សាយ៖ ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCalculateSummary = async () => {
    if (!confirm(`តើអ្នកពិតជាចង់គណនាពិន្ទុ ${selectedPeriod} សម្រាប់សិស្សទាំងអស់មែនទេ?`)) return;
    setIsCalculating(true);
    try {
      const res = await calculateSummaryScores(selectedPeriod);
      if (res.success) {
        alert(`បានគណនា និងរក្សាទុកពិន្ទុជោគជ័យសម្រាប់សិស្សចំនួន ${res.count} នាក់!`);
        // Trigger refetch
        setSelectedPeriod(selectedPeriod + ' ');
        setTimeout(() => setSelectedPeriod(selectedPeriod.trim()), 100);
      } else {
        alert('កំហុសក្នុងការគណនា៖ ' + res.error);
      }
    } catch (err: any) {
      alert('កំហុសបណ្តាញ៖ ' + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const filteredClasses = classesStatus.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.teacher.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const missingClasses = classesStatus.filter(c => c.status === 'missing');

  if (loading && classesStatus.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យ...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header & Controls */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-[#155EEF]" />
            ផ្ទាំងត្រួតពិនិត្យពិន្ទុសរុប
          </h1>
          <p className="text-sm font-semibold text-[#64748B] mt-1">
            ទិដ្ឋភាពទូទៅនៃការបញ្ចូលពិន្ទុសិស្សប្រចាំខែ {todayStr}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-xs font-bold text-slate-500 hidden sm:block">ខែ៖</span>
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-transparent text-slate-700 py-1 pr-6 focus:outline-none font-bold text-sm cursor-pointer"
            >
              {ACADEMIC_PERIODS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setIsMonthlyExamSheetModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> បង្កើត Sheet ប្រឡង (៨ Tabs)
          </button>

          <button 
            onClick={() => setIsGEIPExportModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-indigo-500/20 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> ទាញទិន្នន័យចេញ GEIP
          </button>

          {(selectedPeriod === 'sem1-summary' || selectedPeriod === 'sem2-summary' || selectedPeriod === 'annual') && (
            <button 
              onClick={handleCalculateSummary}
              disabled={isCalculating}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isCalculating ? 'កំពុងគណនា...' : 'គណនាពិន្ទុឆមាស/ប្រចាំឆ្នាំ'}
            </button>
          )}

          <button 
            onClick={() => setIsRollbackModalOpen(true)}
            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-sm transition-all border border-amber-200 shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" /> ប្រវត្តិ & ស្តារពិន្ទុ
          </button>

          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#155EEF]" /> អាប់ឡូតពិន្ទុ
          </button>
          
          <button 
            onClick={handlePublishScores}
            disabled={isPublishing || draftCount === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none cursor-pointer"
          >
            <Send className="w-4 h-4" /> {isPublishing ? 'កំពុងបោះពុម្ព...' : 'បោះពុម្ពផ្សាយ'}
          </button>
        </div>
      </header>

      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-2">
        <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{classesStatus.length}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <Building2 className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">ថ្នាក់សរុប</p>
        </div>

        <div className="bg-rose-500 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-rose-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{missingClasses.length}</h2>
            <div className="w-9 h-9 bg-rose-400 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-50" />
            </div>
          </div>
          <p className="text-sm font-bold text-rose-100 mt-4">មិនទាន់មានពិន្ទុ</p>
        </div>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{draftCount}</h2>
            <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <Clock className="w-4 h-4 text-yellow-900" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">រង់ចាំបោះពុម្ពផ្សាយ</p>
        </div>

        <div className="bg-emerald-500 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-emerald-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{publishedClassesCount}</h2>
            <div className="w-9 h-9 bg-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-50" />
            </div>
          </div>
          <p className="text-sm font-bold text-emerald-100 mt-4">បានបោះពុម្ពផ្សាយរួច</p>
        </div>
      </div>

      {/* Live Tracking Table */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden flex flex-col mt-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mr-4">
               <Building2 className="w-5 h-5 text-[#155EEF]" />
               តាមដានស្ថានភាពថ្នាក់ (Live Tracking)
            </h2>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#155EEF]/20 shadow-sm cursor-pointer"
            >
              <option value="all">គ្រប់ស្ថានភាពទាំងអស់</option>
              <option value="published">🟢 បានបោះពុម្ពផ្សាយរួច</option>
              <option value="draft">🟡 រង់ចាំបោះពុម្ពផ្សាយ</option>
              <option value="missing">🔴 មិនទាន់មានពិន្ទុ</option>
            </select>
          </div>
          <div className="relative w-full sm:w-64 group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#155EEF] transition-colors" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះថ្នាក់ ឬ គ្រូ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">ថ្នាក់រៀន</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">គ្រូបន្ទុកថ្នាក់</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-center">ស្ថានភាពពិន្ទុប្រចាំខែ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-slate-800 text-sm">{c.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-600 text-xs">{c.teacher}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {c.status === 'published' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> បានបោះពុម្ពផ្សាយ
                      </span>
                    )}
                    {c.status === 'draft' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold shadow-sm">
                        <Clock className="w-3.5 h-3.5" /> រង់ចាំការបោះពុម្ពផ្សាយ
                      </span>
                    )}
                    {c.status === 'missing' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-bold shadow-sm">
                        <AlertCircle className="w-3.5 h-3.5" /> មិនទាន់មានពិន្ទុ
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredClasses.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-500 font-bold">គ្មានទិន្នន័យ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MasterScoreUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => {
           setIsUploadModalOpen(false);
           // Force refetch hack
           setSelectedPeriod(selectedPeriod + ' ');
           setTimeout(() => setSelectedPeriod(selectedPeriod.trim()), 100);
        }} 
        selectedPeriod={selectedPeriod}
      />

      <MasterScoreRollbackModal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        selectedPeriod={selectedPeriod}
        onRollbackSuccess={() => {
           setSelectedPeriod(selectedPeriod + ' ');
           setTimeout(() => setSelectedPeriod(selectedPeriod.trim()), 100);
        }}
      />

      <MonthlyExamSheetModal
        isOpen={isMonthlyExamSheetModalOpen}
        onClose={() => setIsMonthlyExamSheetModalOpen(false)}
        selectedPeriod={selectedPeriod}
      />

      <GEIPExportModal
        isOpen={isGEIPExportModalOpen}
        onClose={() => setIsGEIPExportModalOpen(false)}
        selectedPeriod={selectedPeriod}
      />
    </div>
  );
}
