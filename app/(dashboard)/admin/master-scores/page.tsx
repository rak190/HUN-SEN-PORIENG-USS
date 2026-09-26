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
import { ExamRoomPrintModal } from '@/components/admin/ExamRoomPrintModal';
import { GEIPExportModal } from '@/components/admin/GEIPExportModal';
import { PrePublishAuditModal } from '@/components/admin/PrePublishAuditModal';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { calculateSummaryScores, publishScoresAction } from './actions';
import { RotateCcw, History, Printer } from 'lucide-react';
import { BroadcastStatusModal } from '@/components/admin/BroadcastStatusModal';

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
  const [isExamRoomPrintModalOpen, setIsExamRoomPrintModalOpen] = useState(false);
  const [isGEIPExportModalOpen, setIsGEIPExportModalOpen] = useState(false);
  const [isPublishAuditModalOpen, setIsPublishAuditModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const supabase = createClient();
  const [activeYearId, setActiveYearId] = useState<string | null>(null);

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
        // 0. Fetch active academic year
        const { data: yearData } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_active', true)
          .single();
          
        if (yearData) {
          setActiveYearId(yearData.id);
        }

        // 1. Fetch all classes for the active academic year
        let classesQuery = supabase
          .from('classes')
          .select('id, name, teacher_id, profiles:teacher_id(full_name)')
          .order('name', { ascending: true });
          
        if (yearData) {
          classesQuery = classesQuery.eq('academic_year_id', yearData.id);
        }
        
        const { data: classesData, error: classErr } = await classesQuery;

        if (classErr) throw classErr;

        // 2. Fetch distinct grades for this period (filtered by academic year implicitly via class_id but we should add it if possible, though status checking is fine)
        let gradesQuery = supabase
          .from('grades')
          .select('class_id, status')
          .eq('period', selectedPeriod);
          
        if (yearData) {
          gradesQuery = gradesQuery.eq('academic_year_id', yearData.id);
        }

        const { data: gradesData, error: gradeErr } = await gradesQuery;

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

  const [broadcastSummary, setBroadcastSummary] = useState<any>(null);
  const [isBroadcastingModalOpen, setIsBroadcastingModalOpen] = useState(false);
  const [isRetryingBroadcast, setIsRetryingBroadcast] = useState(false);

  const handlePublishConfirm = async (shouldBroadcast: boolean) => {
    if (!activeYearId) {
       alert('រកមិនឃើញឆ្នាំសិក្សាសកម្មទេ');
       return;
    }
    
    try {
      const result = await publishScoresAction(selectedPeriod, activeYearId);
      if (!result.success) throw new Error(result.error);
      
      // trigger broadcast
      if (shouldBroadcast) {
        const classesWithDrafts = classesStatus.filter(c => c.status === 'draft');
        const classIds = classesWithDrafts.map(c => c.id);
        
        if (classIds.length > 0) {
          const res = await fetch('/api/admin/broadcast-scores/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_ids: classIds, month: selectedPeriod })
          });
          
          const summary = await res.json();
          setBroadcastSummary(summary);
          
          if (summary.isFullSuccess) {
            alert('បានបោះពុម្ព និងផ្សាយពិន្ទុជោគជ័យគ្រប់ចំនួន!');
          } else {
            setIsBroadcastingModalOpen(true);
          }
        } else {
          alert('បានបោះពុម្ពផ្សាយពិន្ទុជោគជ័យ (គ្មានថ្នាក់ត្រូវផ្សាយបន្ត)!');
        }
      } else {
        alert('បានបោះពុម្ពផ្សាយពិន្ទុជោគជ័យ!');
      }

      // Trigger refetch
      setSelectedPeriod(selectedPeriod + ' ');
      setTimeout(() => setSelectedPeriod(selectedPeriod.trim()), 100);
    } catch (err: any) {
      alert('កំហុសក្នុងការបោះពុម្ពផ្សាយ៖ ' + err.message);
    }
  };

  const handleRetryBroadcast = async (failedClassIds: string[]) => {
    setIsRetryingBroadcast(true);
    try {
      const res = await fetch('/api/admin/broadcast-scores/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_ids: failedClassIds, month: selectedPeriod })
      });
      
      const newSummary = await res.json();
      
      // Merge new summary with old summary
      setBroadcastSummary((prev: any) => {
        if (!prev) return newSummary;
        
        // Remove succeeded from failed list, add to succeeded list
        const stillFailed = newSummary.failed;
        const newlySucceeded = newSummary.succeeded;
        
        return {
          total: prev.total,
          succeeded: [...prev.succeeded, ...newlySucceeded],
          failed: stillFailed,
          isFullSuccess: stillFailed.length === 0 && prev.total > 0,
          isPartialSuccess: stillFailed.length > 0
        };
      });
      
    } catch (err: any) {
      alert('កំហុស៖ ' + err.message);
    } finally {
      setIsRetryingBroadcast(false);
    }
  };

  const handleCalculateSummary = async () => {
    if (!activeYearId) {
       alert('រកមិនឃើញឆ្នាំសិក្សាសកម្មទេ');
       return;
    }
    if (!confirm(`តើអ្នកពិតជាចង់គណនាពិន្ទុ ${selectedPeriod} សម្រាប់សិស្សទាំងអស់មែនទេ?`)) return;
    setIsCalculating(true);
    try {
      const res = await calculateSummaryScores(selectedPeriod, activeYearId);
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

  const handleBroadcastClass = async (classId: string, className: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់ផ្ញើលទ្ធផលពិន្ទុខែ ${selectedPeriod} ទៅកាន់អាណាព្យាបាលសិស្សថ្នាក់ ${className} តាមរយៈ Telegram មែនទេ?`)) return;
    
    try {
      const res = await fetch('/api/admin/broadcast-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId, month: selectedPeriod })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to broadcast');
      
      alert(`ជោគជ័យ! បានផ្ញើសារចំនួន ${data.count} ទៅកាន់អាណាព្យាបាលសិស្សថ្នាក់ ${className}។`);
    } catch (error: any) {
      alert('កំហុស៖ ' + error.message);
    }
  };

  const filteredClasses = classesStatus.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.teacher.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const missingClasses = classesStatus.filter(c => c.status === 'missing');

  const [activeTab, setActiveTab] = useState<'scores' | 'logistics' | 'reports'>('scores');

  if (loading && classesStatus.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យ...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
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
        
        {/* Streamlined Action Bar (Visible only in Scores Tab) */}
        {activeTab === 'scores' && (
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
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#155EEF]" /> នាំចូលពិន្ទុ
            </button>
            
            <button 
              onClick={() => setIsPublishAuditModalOpen(true)}
              disabled={isPublishing || draftCount === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none cursor-pointer"
            >
              <Send className="w-4 h-4" /> {isPublishing ? 'កំពុងប្រកាស...' : 'ប្រកាសផ្សាយពិន្ទុ'}
              {draftCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-800 rounded-full">{draftCount}</span>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mt-8 mb-6">
        <button
          onClick={() => setActiveTab('scores')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'scores' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          តារាងពិន្ទុប្រឡង
        </button>
        <button
          onClick={() => setActiveTab('logistics')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'logistics' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          <CheckCircle2 className="w-4 h-4" />
          រៀបចំការប្រឡង & សន្លឹកកិច្ចការ
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'reports' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          <Filter className="w-4 h-4" />
          របាយការណ៍ & សវនកម្ម
        </button>
      </div>

      {/* View Rendering based on activeTab */}
      {activeTab === 'scores' && (
        <div className="space-y-6 animate-fadeIn">
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
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">សកម្មភាព</th>
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
                      <td className="px-6 py-4 text-right">
                        {c.status === 'published' && (
                          <button 
                            onClick={() => handleBroadcastClass(c.id, c.name)}
                            className="px-3 py-1.5 bg-[#155EEF]/10 hover:bg-[#155EEF]/20 text-[#155EEF] font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm inline-flex cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" /> ផ្ញើទៅ Telegram
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredClasses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-500 font-bold">គ្មានទិន្នន័យ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logistics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 justify-between h-full hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">សន្លឹកកិច្ចការប្រឡង (Google Sheet ៨ Tabs)</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                បង្កើត និងភ្ជាប់ Google Sheet ៨ Tabs ទៅកាន់ Google Drive របស់សាលា ដើម្បីឱ្យគ្រូវាយពិន្ទុផ្ទាល់។
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 mb-2">
              <span className="text-xs font-bold text-slate-500">ជ្រើសរើសខែប្រឡង៖</span>
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
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> បើកផ្ទាំងគ្រប់គ្រង Google Sheet (៨ Tabs)
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 justify-between h-full hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <Printer className="w-6 h-6 text-[#155EEF]" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">បន្ទប់ប្រឡង & ស្លាកលេខតុ</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                បោះពុម្ពបញ្ជីបិទតាមទ្វារបន្ទប់ប្រឡង និងស្លាកលេខតុសម្រាប់បិទលើតុកូនសិស្ស។
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 mb-2 opacity-0 select-none pointer-events-none">
              {/* Invisible spacer to align buttons perfectly with Card 1 */}
              <span className="text-xs">Spacer</span>
            </div>

            <button 
              onClick={() => setIsExamRoomPrintModalOpen(true)}
              className="w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-sm transition-all border border-blue-200 shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#155EEF]" /> បោះពុម្ពបន្ទប់ប្រឡង & លេខតុ
            </button>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">របាយការណ៍ GEIP ៣.១.៤</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                នាំចេញទិន្នន័យសិស្សរៀនយឺត និងតម្រូវការថ្នាក់បំប៉នស្របតាមស្តង់ដារក្រសួង។
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 mb-2 mt-4">
              <span className="text-xs font-bold text-slate-500">ជ្រើសរើសខែ៖</span>
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
              onClick={() => setIsGEIPExportModalOpen(true)}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> នាំចេញទិន្នន័យ GEIP ៣.១.៤
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                <Filter className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">គណនាពិន្ទុឆមាស និងប្រចាំឆ្នាំ</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                គណនាពិន្ទុឆមាស និងប្រចាំឆ្នាំ ផ្អែកតាមរូបមន្តរបស់ក្រសួង។
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 mb-2 mt-4">
              <span className="text-xs font-bold text-slate-500">ជ្រើសរើសឆមាស៖</span>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-transparent text-slate-700 py-1 pr-6 focus:outline-none font-bold text-sm cursor-pointer"
              >
                <option value="sem1-summary">ឆមាសទី១ (Sem 1)</option>
                <option value="sem2-summary">ឆមាសទី២ (Sem 2)</option>
                <option value="annual">ប្រចាំឆ្នាំ (Annual)</option>
              </select>
            </div>

            <button 
              onClick={handleCalculateSummary}
              disabled={isCalculating || !(selectedPeriod === 'sem1-summary' || selectedPeriod === 'sem2-summary' || selectedPeriod === 'annual')}
              className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> {isCalculating ? 'កំពុងគណនា...' : 'គណនាសរុប'}
            </button>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">ប្រវត្តិកែប្រែទិន្នន័យ & Rollback</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                ពិនិត្យមើលប្រវត្តិនៃការកែប្រែពិន្ទុ និងទាញយកទិន្នន័យចាស់ត្រឡប់មកវិញក្នុងករណីមានការច្រឡំ។
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 mb-2 mt-4 opacity-0 select-none pointer-events-none">
              <span className="text-xs">Spacer</span>
            </div>

            <button 
              onClick={() => setIsRollbackModalOpen(true)}
              className="w-full px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-sm transition-all border border-amber-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" /> ពិនិត្យប្រវត្តិ & Rollback
            </button>
          </div>
        </div>
      )}

      <MasterScoreUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => {
           setIsUploadModalOpen(false);
           // Force refetch hack
           setSelectedPeriod(selectedPeriod + ' ');
           setTimeout(() => setSelectedPeriod(selectedPeriod.trim()), 100);
        }} 
        selectedPeriod={selectedPeriod}
        academicYearId={activeYearId || ''}
      />

      <MasterScoreRollbackModal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        selectedPeriod={selectedPeriod}
        academicYearId={activeYearId || ''}
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

      <ExamRoomPrintModal
        isOpen={isExamRoomPrintModalOpen}
        onClose={() => setIsExamRoomPrintModalOpen(false)}
        selectedPeriod={selectedPeriod}
      />

      <GEIPExportModal
        isOpen={isGEIPExportModalOpen}
        onClose={() => setIsGEIPExportModalOpen(false)}
        selectedPeriod={selectedPeriod}
      />
      
      <PrePublishAuditModal
        isOpen={isPublishAuditModalOpen}
        onClose={() => setIsPublishAuditModalOpen(false)}
        period={selectedPeriod}
        academicYearId={activeYearId}
        onConfirm={handlePublishConfirm}
      />
      
      <BroadcastStatusModal
        isOpen={isBroadcastingModalOpen}
        onClose={() => setIsBroadcastingModalOpen(false)}
        summary={broadcastSummary}
        onRetry={handleRetryBroadcast}
        isRetrying={isRetryingBroadcast}
      />
    </div>
  );
}
