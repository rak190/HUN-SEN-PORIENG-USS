'use client';

import React, { useState, useEffect } from 'react';
import { 
  School, Calendar, Plus, Save, Trash2, Edit3, Check, X, FileSpreadsheet, 
  Download, Upload, AlertTriangle, Search, Users, Building, 
  CalendarDays, Server, ChevronDown, CalendarCheck, ClipboardList,
  Lock, Unlock, Archive, MoreVertical
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

import { activateAcademicYear, closeAcademicYear, reopenAcademicYear } from './actions';

export default function PremiumMoEYSAcademicSetupPage() {
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [showYearModal, setShowYearModal] = useState(false);
  
  // Transition Modals State
  const [showCloseConfirm, setShowCloseConfirm] = useState<string | null>(null);
  const [showReopenConfirm, setShowReopenConfirm] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const res = await fetch('/api/admin/academic-years');
      const data = await res.json();
      if (data.academicYears && data.academicYears.length > 0) {
        setAcademicYears(data.academicYears);
        const activeYear = data.academicYears.find((y: any) => y.status === 'active' || y.is_active || y.is_current);
        if (activeYear) setSelectedYearId(activeYear.id);
        else setSelectedYearId(data.academicYears[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;

    try {
      const res = await fetch('/api/admin/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_date, end_date }),
      });
      if (res.ok) {
        fetchAcademicYears();
        setShowYearModal(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    setLoading(true);
    try {
      const res = await activateAcademicYear(id);
      if (res.success) {
        await fetchAcademicYears();
      } else {
        alert(res.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseYear = async (id: string) => {
    setLoading(true);
    try {
      const res = await closeAcademicYear(id);
      if (res.success) {
        setShowCloseConfirm(null);
        await fetchAcademicYears();
      } else {
        alert(res.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReopenYear = async (id: string) => {
    if (!reopenReason) return alert('បញ្ជាក់ហេតុផល (Reason required)');
    setLoading(true);
    try {
      const res = await reopenAcademicYear(id, reopenReason);
      if (res.success) {
        setShowReopenConfirm(null);
        setReopenReason('');
        await fetchAcademicYears();
      } else {
        alert(res.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-[#155EEF]" />
            រចនាសម្ព័ន្ធឆ្នាំសិក្សា
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            រៀបចំរចនាសម្ព័ន្ធមូលដ្ឋានសម្រាប់ប្រព័ន្ធសាលារៀន (GEIP Standard)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button onClick={() => setShowYearModal(true)} className="px-6 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-full text-sm transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap group cursor-pointer">
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> ឆ្នាំសិក្សាថ្មី
          </button>
        </div>
      </header>

      {/* Action Switcher */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200/60 pb-4">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-slate-100 shadow-xs">
          <button 
            type="button" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all bg-[#FFCF59] text-yellow-950 shadow-2xs font-extrabold cursor-default"
          >
            <CalendarDays className="w-3.5 h-3.5" /> ឆ្នាំសិក្សា
          </button>
        </div>
      </div>

      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {/* Card 1: Active Year (Blue) */}
          <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
            <div className="flex justify-between items-start">
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-none">
                {academicYears.find(y => y.is_active || y.isActive)?.name || 'មិនមាន'}
              </h2>
              <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
                <CalendarDays className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
              </div>
            </div>
            <p className="text-sm font-bold text-blue-100 mt-4">ឆ្នាំសិក្សាសកម្ម</p>
          </div>
          
          {/* Card 2: Upcoming / Past Years (Yellow) */}
          <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
            <div className="flex justify-between items-start">
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
                {academicYears.filter(y => !(y.is_active || y.isActive)).length || '0'}
              </h2>
              <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
                <Server className="w-4 h-4 text-yellow-900" />
              </div>
            </div>
            <p className="text-sm font-bold text-yellow-950 mt-4">ឆ្នាំផ្សេងៗ</p>
          </div>

          {/* Card 3: Total Years (White) */}
          <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-100 hover:border-slate-200">
            <div className="flex justify-between items-start">
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">{academicYears.length || '0'}</h2>
              <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-500 mt-4">ចំនួនឆ្នាំសរុប</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <span>បញ្ជីឆ្នាំសិក្សា (Academic Years)</span>
              </h3>
              <p className="text-[11px] text-[#64748B] font-medium">កំណត់ត្រាឆ្នាំសិក្សាទាំងអស់ក្នុងប្រព័ន្ធ</p>
            </div>
          </div>

          <div className="space-y-3 pr-1">
            {academicYears.map(y => {
              const status = y.status || (y.is_active ? 'active' : 'closed');
              return (
              <div key={y.id} className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-white hover:bg-slate-50 transition-all border border-slate-100/80 hover:border-slate-200 group relative shadow-2xs">
                <div className={`p-3 rounded-2xl shadow-sm shrink-0 ${status === 'active' ? 'bg-[#FFCF59] text-yellow-950' : status === 'closed' ? 'bg-amber-50 text-amber-600' : status === 'archived' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                  {status === 'closed' ? <Lock className="w-5 h-5" /> : status === 'archived' ? <Archive className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-[#155EEF] transition-colors">
                      {y.name}
                    </h4>
                    {status === 'active' ? (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0 flex items-center gap-1">
                        <Check className="w-3 h-3" /> កំពុងដំណើរការ
                      </span>
                    ) : status === 'closed' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> បានបិទបញ្ចប់ / ចាក់សោ
                      </span>
                    ) : status === 'archived' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">
                        បណ្ណសារ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                        កំពុងរៀបចំ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 font-medium leading-relaxed">
                    ចាប់ផ្តើម: <span className="font-bold text-slate-600">{y.start_date || y.startDate || '-'}</span> • បញ្ចប់: <span className="font-bold text-slate-600">{y.end_date || y.endDate || '-'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 h-full">
                  <div className="relative group/dropdown">
                    <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                      <MoreVertical className="w-4 h-4 text-slate-600" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-10 flex flex-col p-1">
                      {status !== 'active' && (
                        <button onClick={() => handleActivate(y.id)} className="text-left px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-2 cursor-pointer">
                          <Check className="w-4 h-4" /> កំណត់ជាឆ្នាំកំពុងដំណើរការ
                        </button>
                      )}
                      {status === 'active' && (
                        <button onClick={() => setShowCloseConfirm(y.id)} className="text-left px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg flex items-center gap-2 cursor-pointer">
                          <Lock className="w-4 h-4" /> បិទបញ្ចប់ឆ្នាំសិក្សា
                        </button>
                      )}
                      {(status === 'closed' || status === 'archived') && (
                        <button onClick={() => setShowReopenConfirm(y.id)} className="text-left px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 cursor-pointer mt-1 border-t border-slate-100 pt-2">
                          <Unlock className="w-4 h-4" /> បើកដំណើរការឡើងវិញ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* MODALS (Full-Screen Frosted Glass Portal) */}
      <Modal
        isOpen={showYearModal}
        onClose={() => setShowYearModal(false)}
        size="md"
        icon={
          <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
        }
        title="បង្កើតឆ្នាំសិក្សាថ្មី"
      >
        <form onSubmit={handleCreateYear}>
          <div className="p-6 sm:p-8 space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#64748B] mb-1.5 uppercase tracking-wider">
                ឈ្មោះឆ្នាំសិក្សា
              </label>
              <input
                name="name"
                required
                type="text"
                placeholder="2025-2026"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-[#64748B] mb-1.5 uppercase tracking-wider">
                  ថ្ងៃចាប់ផ្តើម
                </label>
                <input
                  name="start_date"
                  required
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-[#64748B] mb-1.5 uppercase tracking-wider">
                  ថ្ងៃបញ្ចប់
                </label>
                <input
                  name="end_date"
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end rounded-b-[32px]">
            <button
              type="button"
              onClick={() => setShowYearModal(false)}
              className="px-6 py-2.5 font-extrabold text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 font-extrabold text-xs text-white bg-[#155EEF] hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {loading ? 'កំពុងបង្កើត...' : 'បង្កើត'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Confirm Modal */}
      <Modal
        isOpen={!!showCloseConfirm}
        onClose={() => setShowCloseConfirm(null)}
        size="sm"
        icon={
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-xs mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
        }
        title={<span className="text-center block text-xl">បិទបញ្ចប់ឆ្នាំសិក្សា</span>}
      >
        <div className="p-6 pt-0 text-center space-y-6">
          <p className="text-sm font-semibold text-slate-600 leading-relaxed">
            តើលោកគ្រូពិតជាចង់បិទបញ្ចប់ឆ្នាំសិក្សានេះមែនទេ? រាល់កំណត់ត្រាពិន្ទុ វត្តមាន និងសិស្សទាំងអស់នឹងត្រូវបានចាក់សោ <strong className="text-amber-700">(Read-Only)</strong> មិនអាចកែប្រែបានទៀតឡើយ។
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowCloseConfirm(null)} className="px-6 py-2.5 font-extrabold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">បោះបង់</button>
            <button onClick={() => handleCloseYear(showCloseConfirm!)} disabled={loading} className="px-6 py-2.5 font-extrabold text-sm text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2">
              {loading ? <Server className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              បិទនិងចាក់សោ
            </button>
          </div>
        </div>
      </Modal>

      {/* Reopen Confirm Modal */}
      <Modal
        isOpen={!!showReopenConfirm}
        onClose={() => {
          setShowReopenConfirm(null);
          setReopenReason('');
        }}
        size="sm"
        icon={
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-xs mx-auto mb-4">
            <Unlock className="w-6 h-6" />
          </div>
        }
        title={<span className="text-center block text-xl">បើកដំណើរការឡើងវិញ</span>}
      >
        <div className="p-6 pt-0 space-y-5 text-center">
          <p className="text-sm font-semibold text-slate-600 leading-relaxed">
            ប្រតិបត្តិការនេះគឺសម្រាប់តែ <strong className="text-blue-700">Admin</strong> ប៉ុណ្ណោះ។ សូមបញ្ជាក់ហេតុផលដែលត្រូវបើកឆ្នាំសិក្សានេះឡើងវិញ៖
          </p>
          <input 
            type="text" 
            placeholder="ហេតុផលបើកឡើងវិញ..." 
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex gap-3 justify-center mt-2">
            <button onClick={() => setShowReopenConfirm(null)} className="px-6 py-2.5 font-extrabold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">បោះបង់</button>
            <button onClick={() => handleReopenYear(showReopenConfirm!)} disabled={loading || !reopenReason} className="px-6 py-2.5 font-extrabold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2">
              {loading ? <Server className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              បើកដំណើរការ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
