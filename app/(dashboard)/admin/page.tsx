'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAdminDashboardData } from './actions';
import {
  Search, Mic, AlertTriangle, X, ArrowUpRight, 
  Users, CheckCircle2, ShieldCheck, Database, Server,
  MessageSquare, UserCog, History, ShieldAlert
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEwsModal, setShowEwsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function loadLiveData() {
      const dashboardData = await fetchAdminDashboardData();
      if (dashboardData) {
        setData(dashboardData);
      }
    }
    loadLiveData();
  }, []);

  if (!data) {
    return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យប្រព័ន្ធ...</div>;
  }

  const { stats, activities, missingDataAlerts } = data;

  const generateSvgPath = (trendData: any[], key: string) => {
    if (!trendData || trendData.length === 0) return '';
    const points = trendData.map((d, i) => {
      const x = i * (500 / (trendData.length - 1 || 1));
      const y = 100 - d[key];
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };
  
  const systemPath = generateSvgPath(stats.trendData, 'systemUsagePct');
  const giepPath = generateSvgPath(stats.trendData, 'giepPct');

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <span>ផ្ទាំងគ្រប់គ្រងគ្រូបង្គោលICT</span>
            <span className="text-[10px] font-black bg-blue-50 text-[#155EEF] px-2 py-0.5 rounded-full border border-blue-100 uppercase translate-y-[-2px]">Admin</span>
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            ជំនួយការសាលា (School Assistant) សម្រាប់គ្រប់គ្រងទិន្នន័យ និងប្រព័ន្ធ GIEP
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Missing Data Alert (EWS Style) */}
          {missingDataAlerts.length > 0 && (
            <button 
              onClick={() => setShowEwsModal(true)} 
              className="relative p-3 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-full shadow-sm text-amber-600 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="ទិន្នន័យខ្វះចន្លោះ"
            >
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-amber-600 text-white flex items-center justify-center text-[8px] font-black rounded-full border border-white">
                {missingDataAlerts.length}
              </span>
            </button>
          )}

          <div className="relative flex-1 sm:flex-none sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរក..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100/80 rounded-full py-3 pl-11 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>

          <button
            onClick={() => alert('មុខងារ Voice Search ជាភាសាខ្មែរនឹងរួចរាល់ឆាប់ៗនេះ!')}
            className="bg-[#FFCF59] p-3 rounded-full shadow-sm text-yellow-950 hover:bg-yellow-400 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
            title="ស្វែងរកដោយសំឡេង"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* EWS Modal: Missing Data Alerts */}
      {showEwsModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEwsModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-amber-50 rounded-t-[32px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">ទិន្នន័យខ្វះចន្លោះ (Missing Data Alerts)</h2>
                  <p className="text-xs font-bold text-amber-600">គ្រូបង្រៀនដែលមិនទាន់បញ្ចូលទិន្នន័យ</p>
                </div>
              </div>
              <button onClick={() => setShowEwsModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors cursor-pointer text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
              {missingDataAlerts.map((alert: any) => (
                <div key={alert.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                      {alert.name}
                      {alert.severity === 'high' && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">បន្ទាន់</span>}
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {alert.reasons.map((r: string, i: number) => (
                        <li key={i} className="text-xs font-bold text-slate-600 flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">
                    <a href={`https://t.me/`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-black rounded-xl text-xs transition-colors cursor-pointer block text-center">
                      ជូនដំណឹងតាម Telegram
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4 Top Stat Cards - Redesigned for Master Controller */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        
        {/* Master Students */}
        <Link href="/admin/students" className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.totalStudents}</h2>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-[#155EEF] group-hover:text-white transition-all">
              <Users className="w-4 h-4 text-[#155EEF] group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">សិស្សសរុប (Master Students)</p>
        </Link>

        {/* Master Attendance */}
        <Link href="/admin/attendance" className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-emerald-600 tracking-tight leading-none">{stats.attendanceRate}</h2>
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">អវត្តមានថ្ងៃនេះ (Master Attendance)</p>
        </Link>

        {/* Master Scores */}
        <Link href="/admin/master-scores" className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.scoresUploaded}</h2>
            <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">ថ្នាក់បានបញ្ជូនពិន្ទុ (Master Scores)</p>
        </Link>

        {/* GIEP Sync */}
        <Link href="/admin/giep-import" className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.dataCompleteness}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <Database className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">GIEP Master Sync</p>
        </Link>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: User Demographics */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-extrabold text-slate-800 text-base">ស្ថិតិអ្នកប្រើប្រាស់</h3>
            <Link href="/admin/users" className="text-xs font-bold text-[#155EEF] hover:underline">
              គ្រប់គ្រង
            </Link>
          </div>

          <div className="flex justify-center mb-6">
            <div className="donut-chart shadow-md">
              <div className="donut-inner shadow-inner">
                <span className="text-[11px] text-[#64748B] font-extrabold uppercase tracking-wider">សរុប</span>
                <span className="text-3xl font-black text-slate-800">{stats.totalUsers}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-2 pt-2 border-t border-slate-50">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#155EEF]" />
                <span className="text-[10px] text-[#64748B] font-bold">គ្រូបង្រៀន</span>
              </div>
              <span className="font-extrabold text-slate-800 text-base">{stats.teachersCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFCF59]" />
                <span className="text-[10px] text-[#64748B] font-bold">ប្រធានថ្នាក់</span>
              </div>
              <span className="font-extrabold text-slate-800 text-base">{stats.monitorsCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-[10px] text-[#64748B] font-bold">នាយក</span>
              </div>
              <span className="font-extrabold text-slate-800 text-base">{stats.principalsCount}</span>
            </div>
          </div>
        </div>

        {/* Trend Line Chart: System Adoption */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">សន្ទស្សន៍ការប្រើប្រាស់ប្រព័ន្ធ</h3>
              <p className="text-[11px] text-[#64748B] font-medium">ការបញ្ចូលទិន្នន័យវត្តមាន/ពិន្ទុ ធៀបនឹងសកម្មភាពគម្រោង GIEP</p>
            </div>
            <div className="relative inline-flex items-center">
              <select className="appearance-none bg-slate-50 text-xs font-bold text-[#64748B] px-3 py-1.5 pr-7 rounded-lg border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors hover:bg-slate-100">
                <option value="8">8 ខែចុងក្រោយ</option>
                <option value="6">6 ខែចុងក្រោយ</option>
              </select>
            </div>
          </div>

          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#155EEF]" />
              <span className="text-xs font-extrabold text-[#64748B]">ការប្រើប្រាស់ប្រព័ន្ធទូទៅ (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#10b981]" />
              <span className="text-xs font-extrabold text-[#64748B]">ឯកសារ GIEP (%)</span>
            </div>
          </div>

          <div className="flex-1 w-full relative pt-4 min-h-[180px]">
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] font-bold text-[#64748B] pb-6 z-10">
              <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
            </div>
            <div className="w-full h-full pl-10 pb-6 flex items-end relative">
              <div className="absolute top-2 left-10 right-0 border-t border-slate-100" />
              <div className="absolute top-1/4 left-10 right-0 border-t border-slate-100" />
              <div className="absolute top-2/4 left-10 right-0 border-t border-slate-100" />
              <div className="absolute top-3/4 left-10 right-0 border-t border-slate-100" />
              <div className="absolute bottom-6 left-10 right-0 border-t border-slate-100" />
              
              <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 500 100" preserveAspectRatio="none">
                {systemPath && <path d={systemPath} fill="none" stroke="#155EEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
                {giepPath && <path d={giepPath} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
            </div>
            <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[11px] font-extrabold text-[#64748B] px-2">
              {stats.trendData?.map((d: any, i: number) => <span key={i}>{d.monthLabel}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Missing Data / Data Status Breakdown */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">ស្ថានភាពបញ្ចូលទិន្នន័យប្រចាំខែ</h3>
              <p className="text-[11px] text-[#64748B] font-medium">ភាពពេញលេញនៃទិន្នន័យបែងចែកតាមកម្រិតថ្នាក់</p>
            </div>
          </div>

          <div className="flex gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#155EEF]" />
              <span className="text-xs font-extrabold text-[#64748B]">បានបញ្ចូលពេញលេញ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-xs font-extrabold text-[#64748B]">ខ្វះចន្លោះ (Missing)</span>
            </div>
          </div>

          <div className="flex-1 flex pt-2 min-h-[160px]">
            <div className="flex flex-col justify-between text-[10px] font-bold text-[#64748B] pb-6 pr-3">
              <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
            </div>
            <div className="flex-1 flex justify-around items-end pb-6 relative px-2">
              {stats.dataStatus?.map((d: any, i: number) => (
                <div key={i} className="w-10 h-full flex flex-col justify-end group cursor-pointer relative mx-2">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white shadow-xl rounded-xl p-2 text-[10px] whitespace-nowrap z-20 font-bold leading-tight border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    ពេញលេញ: <span className="text-[#155EEF]">{d.submitted}%</span><br />
                    ខ្វះចន្លោះ: <span className="text-amber-400">{d.missing}%</span>
                  </div>
                  <div className="w-full bg-amber-400 rounded-t-md group-hover:brightness-110 transition-all" style={{ height: `${d.missing}%` }} />
                  <div className="w-full bg-[#155EEF] rounded-b-md group-hover:brightness-95 transition-all" style={{ height: `${d.submitted}%` }} />
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs font-extrabold text-[#64748B] px-2">
                {stats.dataStatus?.map((d: any, i: number) => <span key={i} className="text-center">{d.grade}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Tech Support Activities */}
        <div className="lg:col-span-7 bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <span>សកម្មភាពគាំទ្របច្ចេកទេស (Tech Support Activities)</span>
                </h3>
                <p className="text-[11px] text-[#64748B] font-medium">កំណត់ត្រាការបណ្តុះបណ្តាល និងជំនួយបច្ចេកទេស</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Add support activity modal')}
                  className="px-3 py-1.5 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span className="text-lg leading-none">+</span>
                  <span>កត់ត្រាសកម្មភាព</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {activities.map((item: any) => (
                <div key={item.id} className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-white hover:bg-slate-50 transition-all border border-slate-100/80 hover:border-slate-200 group relative shadow-2xs">
                  <div className={`p-3 rounded-2xl shadow-sm shrink-0 ${
                    item.activity_type === 'training' ? 'bg-[#FFCF59] text-yellow-950' :
                    item.activity_type === 'account' ? 'bg-purple-600 text-white' : 'bg-[#155EEF] text-white'
                  }`}>
                    {item.activity_type === 'training' ? <Users className="w-5 h-5" /> :
                     item.activity_type === 'account' ? <UserCog className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-[#155EEF] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#64748B] mt-1 font-medium line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-[11px] text-right font-extrabold text-[#64748B] shrink-0">
                    {new Date(item.created_at).toLocaleDateString('km-KH')}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-50 flex justify-end">
            <Link href="/admin/logs" className="text-xs font-extrabold text-[#155EEF] hover:underline flex items-center gap-1">
              <span>មើលកំណត់ហេតុប្រព័ន្ធទាំងអស់</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
