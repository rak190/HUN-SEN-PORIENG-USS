'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, AlertTriangle, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface StudentPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function StudentPromotionModal({
  isOpen,
  onClose,
  onComplete
}: StudentPromotionModalProps) {
  const { activeAcademicYear } = useAuth();
  const [sourceClasses, setSourceClasses] = useState<any[]>([]);
  const [targetClasses, setTargetClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchClasses();
    }
  }, [isOpen]);

  // When source class changes, fetch students
  useEffect(() => {
    if (sourceClassId) {
       fetchStudentsForSource(sourceClassId);
    } else {
       setStudents([]);
       setSelectedStudentIds([]);
    }
  }, [sourceClassId]);

  const fetchClasses = async () => {
    // In a real system, you'd fetch classes from older academic years too.
    // For this prototype, we'll just allow any active class in the system to promote to any other.
    const { data, error } = await supabase.from('classes')
      .select('id, name, grade, academic_year_id, academic_years(name)')
      .eq('is_archived', false)
      .order('grade').order('name');
    
    if (!error && data) {
      setSourceClasses(data);
      setTargetClasses(data);
    }
  };

  const fetchStudentsForSource = async (classId: string) => {
    setFetchingStudents(true);
    // Fetch active enrollments for this class
    const { data, error } = await supabase.from('active_class_rosters')
      .select('id, student_id_number, full_name, gender')
      .eq('enrollment_class_id', classId)
      .order('student_id_number');
      
    if (!error && data) {
      setStudents(data);
      setSelectedStudentIds(data.map(s => s.id)); // Select all by default
    }
    setFetchingStudents(false);
  };

  const handleToggleStudent = (id: string) => {
     if (selectedStudentIds.includes(id)) {
        setSelectedStudentIds(selectedStudentIds.filter(sId => sId !== id));
     } else {
        setSelectedStudentIds([...selectedStudentIds, id]);
     }
  };

  const handlePromote = async () => {
    if (!sourceClassId || !targetClassId) {
      setErrorMsg('សូមជ្រើសរើសថ្នាក់ប្រភព និងថ្នាក់គោលដៅ');
      return;
    }
    if (sourceClassId === targetClassId) {
      setErrorMsg('មិនអាចបញ្ជូនសិស្សទៅថ្នាក់ដដែលបានទេ');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setErrorMsg('សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/promote-students', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            sourceClassId,
            targetClassId,
            eligibleStudentIds: selectedStudentIds
         })
      });
      
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'បរាជ័យក្នុងការឡើងថ្នាក់');

      alert(`បានឡើងថ្នាក់សិស្សចំនួន ${result.promoted_count || selectedStudentIds.length} នាក់ដោយជោគជ័យ!`);
      onComplete();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'មានបញ្ហាក្នុងការឡើងថ្នាក់');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md z-[9999] flex items-center justify-center pt-10 sm:pt-16 pb-10 px-4 overflow-y-auto animate-overlayFade select-none">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative animate-modalScale border border-slate-100/80 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 shrink-0">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">ឡើងថ្នាក់សិស្ស (Promote Students)</h3>
            <p className="text-xs text-slate-500 font-semibold">
              ផ្ទេរសិស្សពីឆ្នាំសិក្សាចាស់ ទៅឆ្នាំសិក្សាថ្មី
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold shrink-0">
            {errorMsg}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-bold mb-1">បញ្ជាក់ (Important Note):</p>
            <p className="opacity-90">មុខងារនេះនឹងធ្វើបច្ចុប្បន្នភាព Student Enrollments របស់សិស្សសម្រាប់ឆ្នាំសិក្សាថ្មី។</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-700">ថ្នាក់ដើម (Source Class)</label>
            <select 
              value={sourceClassId}
              onChange={(e) => setSourceClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- ជ្រើសរើស --</option>
              {sourceClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.academic_years?.name} - ថ្នាក់ទី {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-700">ថ្នាក់ថ្មី (Target Class)</label>
            <select 
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- ជ្រើសរើស --</option>
              {targetClasses.map(c => (
                <option key={c.id} value={c.id}>
                   {c.academic_years?.name} - ថ្នាក់ទី {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 rounded-xl border border-slate-200 mb-6 custom-scrollbar">
           {fetchingStudents ? (
              <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                 <Loader2 className="w-8 h-8 animate-spin" />
                 <p className="text-sm font-bold">កំពុងទាញយកទិន្នន័យ...</p>
              </div>
           ) : sourceClassId && students.length === 0 ? (
              <div className="p-10 text-center text-sm font-bold text-slate-500">
                 គ្មានសិស្សនៅក្នុងថ្នាក់នេះទេ
              </div>
           ) : students.length > 0 ? (
              <table className="w-full text-left text-sm">
                 <thead className="bg-slate-100 sticky top-0 shadow-sm">
                    <tr>
                       <th className="p-3 w-12 text-center">
                          <input 
                             type="checkbox" 
                             checked={selectedStudentIds.length === students.length && students.length > 0}
                             onChange={(e) => {
                                if (e.target.checked) setSelectedStudentIds(students.map(s => s.id));
                                else setSelectedStudentIds([]);
                             }}
                             className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                       </th>
                       <th className="p-3 font-bold text-slate-500">អត្តលេខ</th>
                       <th className="p-3 font-bold text-slate-500">ឈ្មោះ</th>
                       <th className="p-3 font-bold text-slate-500">ភេទ</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {students.map(s => (
                       <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center">
                             <input 
                                type="checkbox" 
                                checked={selectedStudentIds.includes(s.id)}
                                onChange={() => handleToggleStudent(s.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                             />
                          </td>
                          <td className="p-3 font-bold text-slate-700">{s.student_id_number}</td>
                          <td className="p-3 font-bold text-slate-900">{s.full_name}</td>
                          <td className="p-3 text-slate-600">{s.gender}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           ) : (
              <div className="p-10 text-center text-sm font-bold text-slate-400 flex flex-col items-center">
                 <ArrowRightLeft className="w-10 h-10 mb-2 opacity-50" />
                 <p>សូមជ្រើសរើសថ្នាក់ដើមដើម្បីមើលបញ្ជីសិស្ស</p>
              </div>
           )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            onClick={handlePromote}
            disabled={loading || !sourceClassId || !targetClassId || selectedStudentIds.length === 0}
            className="w-full sm:w-auto flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>កំពុងដំណើរការ...</span>
              </>
            ) : (
              <>
                 <Check className="w-4 h-4" />
                 <span>បញ្ជាក់ការឡើងថ្នាក់ ({selectedStudentIds.length} នាក់)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
