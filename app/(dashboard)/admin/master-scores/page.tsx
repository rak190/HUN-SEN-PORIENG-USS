'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, Upload, Download, Search, 
  Filter, CheckCircle2, AlertCircle, RefreshCw,
  Building2, Users, FileEdit, Check, X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MasterGradeImportModal } from '@/components/principal/MasterGradeImportModal';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';

export default function MasterScoresPage() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('dec');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);

  const supabase = createClient();

  const startEdit = (g: any) => {
    setEditingId(g.id);
    setEditScore(g.total_score);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditScore(0);
  };

  const saveEdit = async (id: string) => {
    if (!id) return;
    
    const { error } = await supabase
      .from('grades')
      .update({ total_score: editScore })
      .eq('id', id);

    if (error) {
      alert('Error updating score: ' + error.message);
      return;
    }

    setGradesData(gradesData.map(g => g.id === id ? { ...g, total_score: editScore } : g));
    setEditingId(null);
  };

  useEffect(() => {
    fetchMasterGrades();
  }, [selectedPeriod]);

  const fetchMasterGrades = async () => {
    setLoading(true);
    // Fetch grades with nested student and class data
    const { data, error } = await supabase
      .from('grades')
      .select(`
        id,
        period,
        total_score,
        student:students(id, full_name, student_id_number, gender, class_id),
        classes!grades_class_id_fkey(id, name)
      `)
      .eq('period', selectedPeriod)
      .limit(500); // Limit for demo purposes

    if (error || !data) {
      console.error(error);
      setGradesData([]);
    } else {
      // Flatten the data for the table
      const formatted = data.map((g: any) => ({
        id: g.id,
        student_id: g.student?.id,
        student_name: g.student?.full_name || 'Unknown',
        student_id_number: g.student?.student_id_number || 'N/A',
        gender: g.student?.gender === 'F' ? 'ស្រី' : 'ប្រុស',
        class_name: g.classes?.name || 'Unknown Class',
        total_score: g.total_score || 0
      }));
      setGradesData(formatted);
    }
    setLoading(false);
  };

  const handleImportComplete = () => {
    fetchMasterGrades();
  };

  const classList = ['all', ...Array.from(new Set(gradesData.map(g => g.class_name)))].sort();

  const filteredGrades = gradesData.filter(g => {
    const matchesSearch = g.student_name.includes(searchQuery) || g.student_id_number.includes(searchQuery);
    const matchesClass = filterClass === 'all' || g.class_name === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 animate-fadeIn select-none pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-[#155EEF]" />
            ផ្ទាំងគ្រប់គ្រងពិន្ទុរួម (Master Scores Dashboard)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            ទាញចូល និងគ្រប់គ្រងពិន្ទុសរុបសម្រាប់គ្រប់ថ្នាក់រៀនទាំងអស់ក្នុងសាលា
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-5 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> ទាញចូល (Import Master Excel)
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-[#155EEF] rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">{gradesData.length}</h4>
            <p className="text-[11px] font-bold text-slate-500">សិស្សមានពិន្ទុខែនេះ</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">
              {classList.length > 1 ? classList.length - 1 : 0}
            </h4>
            <p className="text-[11px] font-bold text-slate-500">ថ្នាក់រៀនបានបញ្ជូនពិន្ទុ</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">
              100%
            </h4>
            <p className="text-[11px] font-bold text-slate-500">ភាពពេញលេញទិន្នន័យរួម</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden">
        
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 w-full md:w-auto overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-slate-500">ខែ/ឆមាស:</label>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer"
              >
                {ACADEMIC_PERIODS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer"
              >
                <option value="all">គ្រប់ថ្នាក់រៀន</option>
                {classList.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 font-extrabold whitespace-nowrap w-16">ល.រ</th>
                <th className="p-4 font-extrabold whitespace-nowrap">ឈ្មោះសិស្ស</th>
                <th className="p-4 font-extrabold whitespace-nowrap">ភេទ</th>
                <th className="p-4 font-extrabold whitespace-nowrap">អត្តលេខ</th>
                <th className="p-4 font-extrabold whitespace-nowrap">ថ្នាក់រៀន</th>
                <th className="p-4 font-extrabold whitespace-nowrap text-right">ពិន្ទុសរុប</th>
                <th className="p-4 font-extrabold text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm font-bold text-slate-400 animate-pulse">
                    កំពុងទាញយកទិន្នន័យពិន្ទុ...
                  </td>
                </tr>
              ) : filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm font-bold text-slate-400 flex flex-col items-center">
                    <FileSpreadsheet className="w-12 h-12 text-slate-200 mb-2" />
                    មិនមានទិន្នន័យពិន្ទុសម្រាប់ខែនេះ ឬថ្នាក់នេះទេ។ សូមចុច "ទាញចូល" ដើម្បីបញ្ចូល។
                  </td>
                </tr>
              ) : (
                filteredGrades.map((g, idx) => {
                  const isEditing = editingId === g.id;
                  
                  return (
                    <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-extrabold text-slate-900 text-sm">{g.student_name}</td>
                      <td className="p-4 text-xs font-bold text-slate-500">{g.gender}</td>
                      <td className="p-4 text-xs font-bold text-slate-500 font-mono bg-slate-50 rounded px-2">{g.student_id_number}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-[#155EEF]/10 text-[#155EEF] font-black text-xs rounded-lg border border-[#155EEF]/20">
                          {g.class_name}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 text-base">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="border border-slate-300 rounded px-2 py-1 w-20 text-right" 
                            value={editScore} 
                            onChange={e => setEditScore(Number(e.target.value))} 
                          />
                        ) : g.total_score}
                      </td>
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => saveEdit(g.id)} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startEdit(g)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="កែប្រែពិន្ទុ (Override Score)"
                          >
                            <FileEdit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MasterGradeImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
