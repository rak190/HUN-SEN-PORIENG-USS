'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, AlertCircle, Copy, Save, Loader2, Info, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { bulkUpdateStudentSeating } from '@/app/(dashboard)/admin/master-scores/actions';

interface QuickSeatingUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PastedRow {
  room: string;
  desk: string;
  studentId: string;
  fullName: string;
  className: string;
}

interface MatchedRow extends PastedRow {
  dbStudentId: string | null;
  dbEnrollmentId: string | null;
  dbFullName: string | null;
  dbClassName: string | null;
  matchStatus: 'GREEN' | 'YELLOW' | 'RED';
  newStudentIdToSave: string | null; // Auto-fill if ID was missing in DB but provided in sheet
  isDuplicateDesk: boolean;
}

export default function QuickSeatingUpdateModal({ isOpen, onClose }: QuickSeatingUpdateModalProps) {
  const { activeAcademicYear } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [pasteData, setPasteData] = useState('');
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  
  // Grade filtering
  const [selectedGrade, setSelectedGrade] = useState('7');
  
  // Data caches
  const [studentsCache, setStudentsCache] = useState<any[]>([]);
  const [classesCache, setClassesCache] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && activeAcademicYear) {
      fetchStudentsAndClasses();
    }
  }, [isOpen, activeAcademicYear, selectedGrade]);

  const fetchStudentsAndClasses = async () => {
    setLoading(true);
    try {
      // 1. Fetch Classes for this year and grade
      const { data: clsData, error: clsErr } = await supabase
        .from('classes')
        .select('id, name, grade')
        .eq('academic_year_id', activeAcademicYear?.id)
        .eq('grade', selectedGrade);
      
      if (clsErr) throw clsErr;
      setClassesCache(clsData || []);
      
      const classIds = (clsData || []).map(c => c.id);
      
      if (classIds.length === 0) {
        setStudentsCache([]);
        setLoading(false);
        return;
      }

      // 2. Fetch Active Enrollments
      const { data: stdData, error: stdErr } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          class_id,
          room_number,
          desk_number,
          students!inner(id, student_id_number, full_name, date_of_birth)
        `)
        .eq('academic_year_id', activeAcademicYear?.id)
        .eq('enrollment_status', 'active')
        .in('class_id', classIds);

      if (stdErr) throw stdErr;
      
      const mapped = (stdData || []).map((e: any) => ({
        enrollment_id: e.id,
        class_id: e.class_id,
        student_uuid: e.students.id,
        student_id_number: e.students.student_id_number,
        full_name: e.students.full_name,
        date_of_birth: e.students.date_of_birth,
        class_name: clsData?.find(c => c.id === e.class_id)?.name || ''
      }));

      setStudentsCache(mapped);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('បរាជ័យក្នុងការទាញយកទិន្នន័យសិស្ស');
    } finally {
      setLoading(false);
    }
  };

  const normalizeKhmerStr = (s: string) => s ? s.replace(/\s+/g, '').trim() : '';

  const handleParse = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!pasteData.trim()) return;

    const rows = pasteData.split(/\r?\n/).filter(r => r.trim() !== '');
    let parsed: PastedRow[] = [];

    for (const r of rows) {
      const cols = r.split('\t').map(c => c.trim());
      // Expecting 4 or 5 columns
      if (cols.length === 5) {
        parsed.push({
          room: cols[0],
          desk: cols[1],
          studentId: cols[2],
          fullName: cols[3],
          className: cols[4]
        });
      } else if (cols.length === 4) {
        // Missing ID entirely
        parsed.push({
          room: cols[0],
          desk: cols[1],
          studentId: '',
          fullName: cols[2],
          className: cols[3]
        });
      } else {
         continue; // skip malformed rows
      }
    }

    if (parsed.length === 0) {
      setErrorMsg('ទម្រង់ទិន្នន័យមិនត្រឹមត្រូវ។ សូមប្រាកដថាអ្នក copy បាន ៥ ជួរឈរ (លេខបន្ទប់, លេខតុ, អត្តលេខ, ឈ្មោះ, ថ្នាក់)');
      return;
    }

    // Smart Matching Engine
    let matched: MatchedRow[] = [];
    let roomDeskMap: Record<string, number> = {};

    for (const p of parsed) {
      let dbMatch = null;
      let status: 'GREEN' | 'YELLOW' | 'RED' = 'RED';
      let autoFillId = null;

      // Tier 1: ID Match
      if (p.studentId) {
        dbMatch = studentsCache.find(s => s.student_id_number === p.studentId);
        if (dbMatch) status = 'GREEN';
      }

      // Tier 2: Name + Class Match
      if (!dbMatch && p.fullName && p.className) {
        const normName = normalizeKhmerStr(p.fullName);
        const normClass = normalizeKhmerStr(p.className);
        
        const potentials = studentsCache.filter(s => 
          normalizeKhmerStr(s.full_name) === normName &&
          normalizeKhmerStr(s.class_name) === normClass
        );

        if (potentials.length === 1) {
          dbMatch = potentials[0];
          status = 'YELLOW';
          // Check if we can autofill the missing ID in DB
          if (!dbMatch.student_id_number && p.studentId) {
             autoFillId = p.studentId;
          }
        }
      }

      // Duplicate Check (Case Insensitive Room)
      const roomKey = p.room.toLowerCase().trim();
      const deskKey = p.desk.trim();
      const comboKey = `${roomKey}-${deskKey}`;
      let isDup = false;
      
      if (roomKey && deskKey) {
        roomDeskMap[comboKey] = (roomDeskMap[comboKey] || 0) + 1;
        if (roomDeskMap[comboKey] > 1) {
          isDup = true;
        }
      }

      matched.push({
        ...p,
        dbStudentId: dbMatch ? dbMatch.student_uuid : null,
        dbEnrollmentId: dbMatch ? dbMatch.enrollment_id : null,
        dbFullName: dbMatch ? dbMatch.full_name : null,
        dbClassName: dbMatch ? dbMatch.class_name : null,
        matchStatus: status,
        newStudentIdToSave: autoFillId,
        isDuplicateDesk: isDup
      });
    }

    // Second pass to mark all instances of a duplicate desk
    matched = matched.map(m => {
      const combo = `${m.room.toLowerCase().trim()}-${m.desk.trim()}`;
      return {
        ...m,
        isDuplicateDesk: roomDeskMap[combo] > 1
      };
    });

    setMatchedRows(matched);
  };

  const handleManualSelect = (index: number, enrollmentId: string) => {
    const student = studentsCache.find(s => s.enrollment_id === enrollmentId);
    if (!student) return;

    setMatchedRows(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        dbStudentId: student.student_uuid,
        dbEnrollmentId: student.enrollment_id,
        dbFullName: student.full_name,
        dbClassName: student.class_name,
        matchStatus: 'YELLOW',
        newStudentIdToSave: (!student.student_id_number && next[index].studentId) ? next[index].studentId : null
      };
      return next;
    });
  };

  const hasDuplicates = matchedRows.some(r => r.isDuplicateDesk);
  const unMatchedCount = matchedRows.filter(r => r.matchStatus === 'RED').length;
  const canSave = matchedRows.length > 0 && !hasDuplicates && unMatchedCount === 0;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    setErrorMsg('');
    
    try {
      const updates = matchedRows.map(r => ({
        enrollmentId: r.dbEnrollmentId as string,
        studentId: r.dbStudentId as string,
        roomNumber: r.room,
        deskNumber: r.desk,
        newStudentId: r.newStudentIdToSave || undefined
      }));

      const res = await bulkUpdateStudentSeating(updates);
      if (!res.success) throw new Error(res.error);
      
      setSuccessMsg(res.message || '');
      setPasteData('');
      setMatchedRows([]);
      fetchStudentsAndClasses(); // refresh
      
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-800 font-kantumruy flex items-center gap-2">
              <Copy className="w-5 h-5 text-[#155EEF]" />
              បញ្ចូលកន្លែងអង្គុយរហ័ស (Quick Seating Patch)
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Copy ពីផ្ទាំង Excel នាយកដែលមាន ៥ ជួរឈរ: លេខបន្ទប់ | លេខតុ | អត្តលេខ | ឈ្មោះពេញ | ថ្នាក់
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto flex flex-col p-6 space-y-6">
          
          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-700">កម្រិតថ្នាក់:</label>
              <select 
                value={selectedGrade} 
                onChange={e => setSelectedGrade(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF]"
              >
                <option value="7">ថ្នាក់ទី ៧</option>
                <option value="8">ថ្នាក់ទី ៨</option>
                <option value="9">ថ្នាក់ទី ៩</option>
                <option value="10">ថ្នាក់ទី ១០</option>
                <option value="11">ថ្នាក់ទី ១១</option>
                <option value="12">ថ្នាក់ទី ១២</option>
              </select>
            </div>
            
            <button 
              onClick={fetchStudentsAndClasses}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-bold text-slate-700 flex items-center gap-2"
            >
              <RotateCcw className="w-3 h-3" /> Refresh DB
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-emerald-700 text-sm font-bold">
              <Check className="w-5 h-5 shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}

          {/* Textarea */}
          {matchedRows.length === 0 && (
            <div className="flex flex-col gap-2">
              <textarea 
                value={pasteData}
                onChange={e => setPasteData(e.target.value)}
                placeholder="Paste ទិន្នន័យទីនេះ..."
                className="w-full h-40 p-4 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#155EEF] focus:border-transparent resize-none"
              />
              <button 
                onClick={handleParse}
                disabled={!pasteData.trim() || loading}
                className="self-end px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'កំពុងដំណើរការ...' : 'ពិនិត្យទិន្នន័យ (Analyze)'}
              </button>
            </div>
          )}

          {/* Preview Grid */}
          {matchedRows.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                   លទ្ធផលផ្ទៀងផ្ទាត់ ({matchedRows.length} សិស្ស)
                 </h3>
                 <button onClick={() => setMatchedRows([])} className="text-xs text-slate-500 hover:text-slate-800 underline font-bold">
                   ជម្រះទិន្នន័យ
                 </button>
              </div>

              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-2 border-b border-slate-200 text-xs font-black text-slate-600">បន្ទប់/តុ (Pasted)</th>
                      <th className="p-2 border-b border-slate-200 text-xs font-black text-slate-600">អត្តលេខ</th>
                      <th className="p-2 border-b border-slate-200 text-xs font-black text-slate-600">ឈ្មោះក្នុង Sheet</th>
                      <th className="p-2 border-b border-slate-200 text-xs font-black text-slate-600">ថ្នាក់</th>
                      <th className="p-2 border-b border-slate-200 text-xs font-black text-slate-600 border-l-2 border-l-slate-300 bg-blue-50/50">ឈ្មោះក្នុងប្រព័ន្ធ (Matched)</th>
                      <th className="p-2 border-b border-slate-200 text-xs font-black text-slate-600 bg-blue-50/50">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className={`p-2 border-b border-slate-100 text-sm font-bold ${r.isDuplicateDesk ? 'text-rose-600 bg-rose-50' : 'text-slate-700'}`}>
                          {r.room} / {r.desk}
                          {r.isDuplicateDesk && <AlertCircle className="inline-block ml-1 w-4 h-4 text-rose-500" />}
                        </td>
                        <td className="p-2 border-b border-slate-100 text-sm text-slate-600 font-mono">{r.studentId || '-'}</td>
                        <td className="p-2 border-b border-slate-100 text-sm font-bold text-slate-800">{r.fullName}</td>
                        <td className="p-2 border-b border-slate-100 text-sm font-bold text-slate-600">{r.className}</td>
                        
                        <td className="p-2 border-b border-slate-100 text-sm font-bold text-slate-800 border-l-2 border-l-slate-200 bg-blue-50/10">
                          {r.matchStatus === 'RED' ? (
                            <select 
                              className="w-full text-xs p-1.5 border border-rose-300 rounded text-slate-800 bg-white focus:ring-1 focus:ring-rose-500"
                              onChange={(e) => handleManualSelect(i, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>-- ជ្រើសរើសសិស្សដោយដៃ --</option>
                              {studentsCache
                                .filter(s => normalizeKhmerStr(s.class_name) === normalizeKhmerStr(r.className))
                                .map(s => (
                                  <option key={s.enrollment_id} value={s.enrollment_id}>
                                    {s.full_name} ({s.student_id_number || 'គ្មានID'}) - {s.class_name}
                                  </option>
                                ))
                              }
                            </select>
                          ) : (
                            <div className="flex flex-col">
                              <span>{r.dbFullName}</span>
                              {r.newStudentIdToSave && (
                                <span className="text-[10px] text-[#155EEF] font-semibold">+ នឹងបំពេញអត្តលេខ {r.newStudentIdToSave}</span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        <td className="p-2 border-b border-slate-100 bg-blue-50/10">
                          {r.matchStatus === 'GREEN' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"><Check className="w-3 h-3"/> ID Match</span>}
                          {r.matchStatus === 'YELLOW' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold"><Check className="w-3 h-3"/> Name Match</span>}
                          {r.matchStatus === 'RED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold"><X className="w-3 h-3"/> Not Found</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
            {hasDuplicates && <span className="text-xs font-bold text-rose-600">* មានលេខតុស្ទួនក្នុងបន្ទប់តែមួយ សូមកែតម្រូវទិន្នន័យ (ពណ៌ក្រហម)</span>}
            {unMatchedCount > 0 && <span className="text-xs font-bold text-rose-600">* មានសិស្សរកមិនឃើញ សូមជ្រើសរើសដោយដៃ</span>}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2 text-slate-600 hover:text-slate-800 font-bold text-sm transition-colors"
            >
              បោះបង់
            </button>
            <button 
              onClick={handleSave}
              disabled={!canSave || loading}
              className="px-6 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {!loading && <Save className="w-4 h-4" />}
              រក្សាទុក (Save)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
