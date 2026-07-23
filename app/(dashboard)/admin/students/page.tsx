'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Filter, FileSpreadsheet, 
  Download, Edit2, Check, X, ShieldCheck,
  ArrowRightLeft, UserX
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import StudentMigrationModal from './components/StudentMigrationModal';

export default function MasterStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select(`
        id, 
        full_name, 
        student_id_number, 
        gender, 
        is_active,
        class_id
      `)
      .order('full_name');

    if (error || !data) {
      console.error("Supabase Students Error:", error);
      setStudents([]);
    } else {
      // Also fetch classes to map names
      const { data: classesData } = await supabase.from('classes').select('id, name');
      const classMap = new Map(classesData?.map(c => [c.id, c.name]) || []);

      const formatted = data.map((d: any) => ({
        ...d,
        class_name: classMap.get(d.class_id) || 'គ្មានថ្នាក់'
      }));
      setStudents(formatted);
    }
    setLoading(false);
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({ ...s });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    const { error } = await supabase
      .from('students')
      .update({
        full_name: editForm.full_name,
        gender: editForm.gender,
        student_id_number: editForm.student_id_number,
        is_active: editForm.is_active
      })
      .eq('id', editingId);

    if (error) {
      alert('Error updating student: ' + error.message);
      return;
    }

    setStudents(students.map(s => s.id === editingId ? { ...s, ...editForm } : s));
    setEditingId(null);
    setEditForm({});
  };

  // Derived filters
  const classes = ['all', ...Array.from(new Set(students.map(s => s.class_name)))].sort();
  
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.includes(searchQuery) || (s.student_id_number || '').includes(searchQuery);
    const matchesClass = filterClass === 'all' || s.class_name === filterClass;
    return matchesSearch && matchesClass;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMigrationComplete = () => {
    fetchStudents();
    setSelectedStudents([]);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-[#155EEF]" />
            បញ្ជីសិស្សសរុប (Master Student List)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            គ្រប់គ្រងទិន្នន័យសិស្សទាំងអស់នៅក្នុងសាលា
          </p>
        </div>

        <div className="flex gap-2">
          <Link 
            href="/admin/giep-import"
            className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> ធ្វើសមកាលកម្មពី Google Sheet
          </Link>
          <button className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-[#155EEF] rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">{students.length}</h4>
            <p className="text-[11px] font-bold text-slate-500">ចំនួនសិស្សសរុប</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">
              {students.filter(s => s.is_active).length}
            </h4>
            <p className="text-[11px] font-bold text-slate-500">សិស្សកំពុងសិក្សា (Active)</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer"
              >
                <option value="all">ថ្នាក់រៀនទាំងអស់</option>
                {classes.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c as string}>{c as string}</option>
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

        {/* Bulk Actions Bar */}
        {selectedStudents.length > 0 && (
          <div className="bg-indigo-50/80 px-4 py-3 border-b border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-indigo-800">
                បានជ្រើសរើស {selectedStudents.length} នាក់
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsMigrationModalOpen(true)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" /> ផ្ទេរថ្នាក់ (Migrate)
              </button>
              <button 
                className="px-4 py-1.5 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <UserX className="w-4 h-4" /> ផ្អាកការសិក្សា
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-[#155EEF] focus:ring-[#155EEF] cursor-pointer"
                    checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 font-extrabold whitespace-nowrap">ឈ្មោះសិស្ស</th>
                <th className="p-4 font-extrabold whitespace-nowrap">ភេទ</th>
                <th className="p-4 font-extrabold whitespace-nowrap">អត្តលេខ</th>
                <th className="p-4 font-extrabold whitespace-nowrap">ថ្នាក់រៀន</th>
                <th className="p-4 font-extrabold whitespace-nowrap text-center">ស្ថានភាព</th>
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
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-400">
                    រកមិនឃើញទិន្នន័យទេ
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const isEditing = editingId === student.id;

                  return (
                    <tr key={student.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedStudents.includes(student.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-[#155EEF] focus:ring-[#155EEF] cursor-pointer"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleSelect(student.id)}
                        />
                      </td>
                      <td className="p-4 font-extrabold text-slate-900 text-sm">
                        {isEditing ? (
                          <input type="text" className="border border-slate-300 rounded px-2 py-1 w-40" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                        ) : student.full_name}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-600">
                        {isEditing ? (
                          <select className="border border-slate-300 rounded px-2 py-1" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                            <option value="M">ប្រុស (M)</option>
                            <option value="F">ស្រី (F)</option>
                          </select>
                        ) : (student.gender === 'F' ? 'ស្រី' : 'ប្រុស')}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-700">
                        {isEditing ? (
                          <input type="text" className="border border-slate-300 rounded px-2 py-1 w-24 text-xs" value={editForm.student_id_number || ''} onChange={e => setEditForm({...editForm, student_id_number: e.target.value})} />
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 rounded-md font-mono">{student.student_id_number || 'N/A'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-[#155EEF]/10 text-[#155EEF] font-black text-xs rounded-lg border border-[#155EEF]/20">
                          {student.class_name}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <select 
                            className="border border-slate-300 rounded px-2 py-1 text-xs font-bold" 
                            value={editForm.is_active ? 'active' : 'dropped'} 
                            onChange={e => setEditForm({...editForm, is_active: e.target.value === 'active'})}
                          >
                            <option value="active">សកម្ម (Active)</option>
                            <option value="dropped">បោះបង់ការសិក្សា (Dropped Out)</option>
                            <option value="transferred">ផ្ទេរចេញ (Transferred Out)</option>
                            <option value="suspended">ពន្យារការសិក្សា (Suspended)</option>
                          </select>
                        ) : (
                          student.is_active ? (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                              កំពុងសិក្សា
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                              បោះបង់ការសិក្សា
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
                          <button onClick={() => startEdit(student)} className="p-2 text-slate-400 hover:text-[#155EEF] hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
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
      
      {isMigrationModalOpen && (
        <StudentMigrationModal 
          isOpen={isMigrationModalOpen} 
          onClose={() => setIsMigrationModalOpen(false)} 
          selectedStudentIds={selectedStudents}
          onComplete={handleMigrationComplete}
        />
      )}
    </div>
  );
}
