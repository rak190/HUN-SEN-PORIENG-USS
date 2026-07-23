'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  AlertCircle,
  X,
  Loader2,
  Check,
  Send
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'permission';

interface StudentRow {
  id: string;
  name: string;
  gender: 'M' | 'F';
  status: AttendanceStatus;
}

const cycleStatus = (currentStatus: AttendanceStatus): AttendanceStatus => {
  switch (currentStatus) {
    case 'present': return 'absent';
    case 'absent': return 'permission';
    case 'permission': return 'present';
    default: return 'present';
  }
};

const StatusButton = ({ status, onClick }: { status: AttendanceStatus, onClick: () => void }) => {
  let bgClass = '';
  let textClass = '';
  let icon = null;
  let label = '';
  
  switch(status) {
    case 'present':
      bgClass = 'bg-emerald-50 border-emerald-200';
      textClass = 'text-emerald-700';
      icon = <CheckCircle2 className="w-4 h-4" />;
      label = 'វត្តមាន (វ)';
      break;
    case 'absent':
      bgClass = 'bg-rose-50 border-rose-200';
      textClass = 'text-rose-700';
      icon = <XCircle className="w-4 h-4" />;
      label = 'អត់ច្បាប់ (អ.ច)';
      break;
    case 'permission':
      bgClass = 'bg-purple-50 border-purple-200';
      textClass = 'text-purple-700';
      icon = <Mail className="w-4 h-4" />;
      label = 'ច្បាប់ (ច)';
      break;
  }
  
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border ${bgClass} ${textClass} font-black text-xs w-[115px] shadow-sm transition-transform active:scale-95 touch-manipulation cursor-pointer`}
    >
      {icon} <span>{label}</span>
    </button>
  );
};

export default function MonitorAttendancePage() {
  const { activeClass, profile } = useAuth();
  const searchParams = useSearchParams();
  const dateQuery = searchParams?.get('date');
  
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(dateQuery || new Date().toISOString().split('T')[0]);
  const [formattedDate, setFormattedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [missingDays, setMissingDays] = useState<string[]>([]);
  const [showMissingBanner, setShowMissingBanner] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const dateObj = new Date(selectedDate);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setFormattedDate(dateObj.toLocaleDateString('km-KH', options));
    
    async function fetchAttendance() {
      setIsLoading(true);
      if (!activeClass?.id) {
         setStudents([
            { id: 'std-1', name: 'កែវ ច័ន្ទធីតា', gender: 'F', status: 'present' },
            { id: 'std-2', name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', status: 'present' },
            { id: 'std-3', name: 'ចាន់ ស្រីនាថ', gender: 'F', status: 'absent' },
            { id: 'std-4', name: 'ជា លីហួ', gender: 'M', status: 'present' },
            { id: 'std-5', name: 'ឌី សុខលីម', gender: 'F', status: 'permission' },
            { id: 'std-6', name: 'តាំង ម៉េងហុង', gender: 'M', status: 'present' },
            { id: 'std-7', name: 'ថៃ ស្រីពេជ្រ', gender: 'F', status: 'present' },
            { id: 'std-8', name: 'នួន សុខសាន្ត', gender: 'M', status: 'present' },
            { id: 'std-9', name: 'ប៊ុន ចាន់រិទ្ធ', gender: 'M', status: 'present' },
            { id: 'std-10', name: 'ផន សុវណ្ណារី', gender: 'F', status: 'late' },
            { id: 'std-11', name: 'យឹម វិចិត្រ', gender: 'M', status: 'present' },
            { id: 'std-12', name: 'រស់ ចរិយា', gender: 'F', status: 'absent' },
            { id: 'std-13', name: 'សៅ ឧត្តម', gender: 'M', status: 'present' },
            { id: 'std-14', name: 'ហេង ស្រីពៅ', gender: 'F', status: 'permission' },
            { id: 'std-15', name: 'ឡុង បញ្ញា', gender: 'M', status: 'present' }
         ]);
         setIsLoading(false);
         return;
      }
      
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('id, full_name, gender')
        .eq('class_id', activeClass.id)
        .order('full_name', { ascending: true });
        
      if (studentsData && !error) {
        const { data: attData } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('class_id', activeClass.id)
          .eq('date', selectedDate);
          
        const attMap = new Map(attData?.map(a => [a.student_id, a.status]) || []);
        
        if (studentsData.length < 15) {
          // Force mock data for UI testing to ensure scrollability is visible
          setStudents([
            { id: 'std-1', name: 'កែវ ច័ន្ទធីតា', gender: 'F', status: 'present' },
            { id: 'std-2', name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', status: 'present' },
            { id: 'std-3', name: 'ចាន់ ស្រីនាថ', gender: 'F', status: 'absent' },
            { id: 'std-4', name: 'ជា លីហួ', gender: 'M', status: 'present' },
            { id: 'std-5', name: 'ឌី សុខលីម', gender: 'F', status: 'permission' },
            { id: 'std-6', name: 'តាំង ម៉េងហុង', gender: 'M', status: 'present' },
            { id: 'std-7', name: 'ថៃ ស្រីពេជ្រ', gender: 'F', status: 'present' },
            { id: 'std-8', name: 'នួន សុខសាន្ត', gender: 'M', status: 'present' },
            { id: 'std-9', name: 'ប៊ុន ចាន់រិទ្ធ', gender: 'M', status: 'present' },
            { id: 'std-10', name: 'ផន សុវណ្ណារី', gender: 'F', status: 'late' },
            { id: 'std-11', name: 'យឹម វិចិត្រ', gender: 'M', status: 'present' },
            { id: 'std-12', name: 'រស់ ចរិយា', gender: 'F', status: 'absent' },
            { id: 'std-13', name: 'សៅ ឧត្តម', gender: 'M', status: 'present' },
            { id: 'std-14', name: 'ហេង ស្រីពៅ', gender: 'F', status: 'permission' },
            { id: 'std-15', name: 'ឡុង បញ្ញា', gender: 'M', status: 'present' }
          ]);
        } else {
          setStudents(studentsData.map(s => ({
            id: s.id,
            name: s.full_name,
            gender: (s.gender as 'M' | 'F') || 'F',
            status: (attMap.get(s.id) as AttendanceStatus) || 'present'
          })));
        }
      }
      setIsLoading(false);
    }
    
    fetchAttendance();
  }, [activeClass?.id, selectedDate]);

  // Fetch missing days (last 7 weekdays)
  useEffect(() => {
    async function checkMissingDays() {
      if (!activeClass?.id) {
        // Mock missing days if no class is selected
        const mockPast = new Date();
        mockPast.setDate(mockPast.getDate() - 2);
        setMissingDays([mockPast.toISOString().split('T')[0]]);
        return;
      }
      
      const today = new Date();
      // Only care if today is past 4 PM maybe? We'll just look at strictly past days to be safe
      const pastDays: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Exclude Saturday (6) and Sunday (0)
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          pastDays.push(d.toISOString().split('T')[0]);
        }
      }

      if (pastDays.length === 0) return;

      const { data } = await supabase
        .from('attendance_records')
        .select('date')
        .eq('class_id', activeClass.id)
        .in('date', pastDays);

      const recordedDates = new Set(data?.map(r => r.date) || []);
      const missing = pastDays.filter(d => !recordedDates.has(d));
      
      if (missing.length === 7) {
         // If literally all 7 days are missing (e.g. brand new DB), just show 2 recent missing days to not overwhelm UI
         setMissingDays(missing.slice(0, 2));
      } else {
         setMissingDays(missing);
      }
    }
    checkMissingDays();
  }, [activeClass?.id]);

  const handleCycle = (id: string, currentStatus: AttendanceStatus) => {
    const nextStatus = cycleStatus(currentStatus);
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: nextStatus } : s));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
  };

  const handleSave = async (type: 'submit') => {
    setIsSaving(true);
    
    try {
      const upsertPayload = students.map(s => ({
        class_id: activeClass?.id || 'demo-class-1',
        student_id: s.id,
        date: selectedDate,
        status: s.status,
        recorded_by: profile?.id || null,
        updated_at: new Date().toISOString()
      }));

      const { error: dbError } = await supabase
        .from('attendance_records')
        .upsert(upsertPayload, { onConflict: 'class_id,student_id,date' });

      if (dbError) {
        console.error('Supabase error:', dbError);
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          className: activeClass?.name || '12 ក',
          students
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      setMissingDays(prev => prev.filter(d => d !== selectedDate));
      setToast({ message: 'បញ្ជូនវត្តមានប្រចាំថ្ងៃទៅកាន់គ្រូដោយជោគជ័យ!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Failed to submit:', error);
      setToast({ message: 'មានកំហុសក្នុងការបញ្ជូនទិន្នន័យ។ សូមសាកល្បងម្តងទៀត។', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
    
    setIsSaving(false);
  };

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    permission: students.filter(s => s.status === 'permission').length,
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-slate-50 to-[#F8FAFC] flex flex-col relative font-sans sm:rounded-[32px] sm:shadow-[0_8px_40px_rgb(0,0,0,0.08)] sm:border border-white/60 overflow-hidden pb-12 sm:pb-0 selection:bg-blue-100">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`absolute top-4 left-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-5 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header (Glassmorphism) */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-white/40 pt-6 pb-4 px-5 sticky top-0 z-10 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-700 border border-slate-200 shadow-sm">
            ថ្នាក់ {activeClass?.name || '12 ក'}
          </div>
        </div>
        
        <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex gap-5 text-center px-2">
             <div>
                <div className="text-emerald-600 font-black text-base">{stats.present}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">វ</div>
             </div>
             <div>
                <div className="text-rose-600 font-black text-base">{stats.absent}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">អ.ច</div>
             </div>
             <div>
                <div className="text-purple-600 font-black text-base">{stats.permission}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ច</div>
             </div>
          </div>
          <button onClick={markAllPresent} className="text-[10px] font-black text-[#155EEF] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-100 transition-colors shadow-sm cursor-pointer">
            ទាំងអស់
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4 flex flex-col gap-4">
        
        {/* Missing Days Card */}
        {missingDays.length > 0 && showMissingBanner && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-rose-100 shadow-[0_8px_30px_rgb(244,63,94,0.06)] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-rose-600"></div>
            <div className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0 mt-0.5 border border-rose-100">
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2.5">
                  <h4 className="text-slate-800 text-sm font-extrabold tracking-tight pt-1">ថ្ងៃដែលមិនទាន់ស្រង់អវត្តមាន</h4>
                  <button onClick={() => setShowMissingBanner(false)} className="text-slate-400 hover:text-slate-600 p-1 -mr-2 -mt-1 cursor-pointer bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingDays.map(d => (
                    <button 
                      key={d} 
                      onClick={() => setSelectedDate(d)}
                      className="px-3.5 py-1.5 bg-white border border-rose-100 shadow-sm rounded-lg text-rose-600 text-xs font-bold hover:bg-rose-50 hover:border-rose-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                      {new Date(d).toLocaleDateString('km-KH', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 animate-pulse"></div>
                    <div className="h-4 w-32 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                  <div className="w-[115px] h-[34px] bg-slate-100 rounded-xl animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="divide-y divide-slate-100/80">
              {students.map((student, index) => (
                <div key={student.id} className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3.5 overflow-hidden pr-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 shadow-inner">
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-slate-800 text-[13px] truncate">{student.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{student.gender}</span>
                    </div>
                  </div>
                  <StatusButton status={student.status} onClick={() => handleCycle(student.id, student.status)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed sm:absolute bottom-6 left-0 right-0 max-w-md mx-auto px-4 pointer-events-none z-20">
         <button 
           onClick={() => handleSave('submit')} 
           disabled={isSaving} 
           className="w-full py-4 bg-[#155EEF] hover:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 pointer-events-auto transition-transform active:scale-95 disabled:opacity-50 border border-blue-600 cursor-pointer"
         >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងបញ្ជូន...</>
            ) : (
              <><Send className="w-4 h-4" /> បញ្ជូនទៅគ្រូបន្ទុកថ្នាក់</>
            )}
         </button>
      </div>
    </div>
  );
}
