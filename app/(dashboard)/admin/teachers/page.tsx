'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Filter, FileSpreadsheet, Download, 
  CheckCircle2, XCircle, Edit2, Check, X, Building2,
  MoreVertical, ShieldCheck, UserCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Teacher = {
  id: string;
  full_name: string;
  gender: string;
  ministry_id: string;
  subject_specialty: string;
  qualification_level: string;
  is_giep_trained: boolean;
};

export default function TeacherStructurePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGiep, setFilterGiep] = useState('all');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Teacher>>({});

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    // Note: If no real data exists, we'll fall back to mock data
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, ministry_id, subject_specialty, qualification_level, is_giep_trained')
      .in('role', ['teacher', 'monitor']); // assuming we want anyone who teaches

    if (error || !data || data.length === 0) {
      // Fallback to mock data for demo
      setTeachers([
        { id: '1', full_name: 'លោកគ្រូ សុខា', gender: 'ប្រុស', ministry_id: 'MOE-1001', subject_specialty: 'គណិតវិទ្យា', qualification_level: 'បរិញ្ញាបត្រ', is_giep_trained: true },
        { id: '2', full_name: 'អ្នកគ្រូ នារី', gender: 'ស្រី', ministry_id: 'MOE-1002', subject_specialty: 'ភាសាខ្មែរ', qualification_level: 'បរិញ្ញាបត្រ', is_giep_trained: false },
        { id: '3', full_name: 'លោកគ្រូ សម្បត្តិ', gender: 'ប្រុស', ministry_id: 'MOE-1003', subject_specialty: 'រូបវិទ្យា', qualification_level: 'អនុបណ្ឌិត', is_giep_trained: true },
        { id: '4', full_name: 'អ្នកគ្រូ សុជាតា', gender: 'ស្រី', ministry_id: 'MOE-1004', subject_specialty: 'គីមីវិទ្យា', qualification_level: 'បរិញ្ញាបត្រ', is_giep_trained: false },
        { id: '5', full_name: 'លោកគ្រូ វិចិត្រ', gender: 'ប្រុស', ministry_id: 'MOE-1005', subject_specialty: 'ICT', qualification_level: 'បរិញ្ញាបត្រ', is_giep_trained: true },
      ]);
    } else {
      // Map data
      const mapped = data.map((d: any) => ({
        id: d.id,
        full_name: d.full_name,
        gender: 'មិនបញ្ជាក់', // Not in current schema, placeholder
        ministry_id: d.ministry_id || 'N/A',
        subject_specialty: d.subject_specialty || 'ទូទៅ',
        qualification_level: d.qualification_level || 'បរិញ្ញាបត្រ',
        is_giep_trained: d.is_giep_trained || false
      }));
      setTeachers(mapped);
    }
    setLoading(false);
  };

  const startEdit = (t: Teacher) => {
    setEditingId(t.id);
    setEditForm({ ...t });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    // In a real app, make API call to save
    // await supabase.from('profiles').update(editForm).eq('id', editingId);

    setTeachers(teachers.map(t => t.id === editingId ? { ...t, ...editForm } : t));
    setEditingId(null);
    setEditForm({});
  };

  // Derived filters
  const subjects = ['all', ...Array.from(new Set(teachers.map(t => t.subject_specialty)))];
  
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = t.full_name.includes(searchQuery) || t.ministry_id.includes(searchQuery);
    const matchesSubject = filterSubject === 'all' || t.subject_specialty === filterSubject;
    const matchesGiep = filterGiep === 'all' || 
                        (filterGiep === 'trained' && t.is_giep_trained) || 
                        (filterGiep === 'untrained' && !t.is_giep_trained);
    return matchesSearch && matchesSubject && matchesGiep;
  });

  return (
    <div className="space-y-6 animate-fadeIn select-none pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-[#155EEF]" />
            រចនាសម្ព័ន្ធគ្រូ (Teacher Structure)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            គ្រប់គ្រងទិន្នន័យគ្រូបង្រៀន មុខវិជ្ជា និងប្រវត្តិការបណ្តុះបណ្តាល GIEP
          </p>
        </div>

        <div className="flex gap-2">
          <Link 
            href="/admin/giep-import"
            className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> ធ្វើសមកាលកម្ម (GIEP Sync)
          </Link>
          <button className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> ទាញចេញ (Export)
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
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">{teachers.length}</h4>
            <p className="text-[11px] font-bold text-slate-500">ចំនួនគ្រូបង្រៀនសរុប</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">
              {teachers.filter(t => t.is_giep_trained).length}
            </h4>
            <p className="text-[11px] font-bold text-slate-500">បានទទួលវគ្គបណ្តុះបណ្តាល GIEP</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">
              {subjects.length - 1}
            </h4>
            <p className="text-[11px] font-bold text-slate-500">មុខវិជ្ជា/ឯកទេសសរុប</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden">
        
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer"
              >
                <option value="all">មុខវិជ្ជាទាំងអស់</option>
                {subjects.filter(s => s !== 'all').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <select 
              value={filterGiep}
              onChange={(e) => setFilterGiep(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF] shrink-0 cursor-pointer"
            >
              <option value="all">ការបណ្តុះបណ្តាល (ទាំងអស់)</option>
              <option value="trained">បានបណ្តុះបណ្តាល</option>
              <option value="untrained">មិនទាន់បានបណ្តុះបណ្តាល</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 font-extrabold whitespace-nowrap">មន្ត្រី/គ្រូបង្រៀន</th>
                <th className="p-4 font-extrabold whitespace-nowrap">អត្តលេខ</th>
                <th className="p-4 font-extrabold whitespace-nowrap">មុខវិជ្ជាឯកទេស</th>
                <th className="p-4 font-extrabold whitespace-nowrap">កម្រិតវប្បធម៌</th>
                <th className="p-4 font-extrabold whitespace-nowrap text-center">GIEP Training</th>
                <th className="p-4 font-extrabold text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-400 animate-pulse">
                    កំពុងផ្ទុកទិន្នន័យ...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-400">
                    រកមិនឃើញទិន្នន័យដែលផ្គូផ្គងទេ
                  </td>
                </tr>
              ) : (
                filteredTeachers.map(teacher => {
                  const isEditing = editingId === teacher.id;

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-[#155EEF] flex items-center justify-center shrink-0">
                            <UserCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {isEditing ? (
                                <input type="text" className="border border-slate-300 rounded px-2 py-1 w-32" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                              ) : teacher.full_name}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500">{teacher.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-700">
                        {isEditing ? (
                          <input type="text" className="border border-slate-300 rounded px-2 py-1 w-24 text-xs" value={editForm.ministry_id} onChange={e => setEditForm({...editForm, ministry_id: e.target.value})} />
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 rounded-md font-mono">{teacher.ministry_id}</span>
                        )}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-700">
                        {isEditing ? (
                          <input type="text" className="border border-slate-300 rounded px-2 py-1 w-24 text-sm" value={editForm.subject_specialty} onChange={e => setEditForm({...editForm, subject_specialty: e.target.value})} />
                        ) : teacher.subject_specialty}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-600">
                        {isEditing ? (
                          <select className="border border-slate-300 rounded px-2 py-1 text-xs" value={editForm.qualification_level} onChange={e => setEditForm({...editForm, qualification_level: e.target.value})}>
                            <option value="បរិញ្ញាបត្រ">បរិញ្ញាបត្រ</option>
                            <option value="អនុបណ្ឌិត">អនុបណ្ឌិត</option>
                            <option value="បណ្ឌិត">បណ្ឌិត</option>
                            <option value="សញ្ញាបត្រគរុកោសល្យ">សញ្ញាបត្រគរុកោសល្យ</option>
                          </select>
                        ) : teacher.qualification_level}
                      </td>
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <label className="flex items-center justify-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editForm.is_giep_trained} onChange={e => setEditForm({...editForm, is_giep_trained: e.target.checked})} className="w-4 h-4 text-[#155EEF] rounded border-slate-300 focus:ring-[#155EEF]" />
                            <span className="text-xs font-bold text-slate-600">បានទទួល</span>
                          </label>
                        ) : (
                          teacher.is_giep_trained ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> YES
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200">
                              <XCircle className="w-3 h-3" /> NO
                            </div>
                          )
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={saveEdit} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(teacher)} className="p-2 text-slate-400 hover:text-[#155EEF] hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <Edit2 className="w-4 h-4" />
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
    </div>
  );
}
