'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { phnomPenhToday, normalizeAttendance, type AttendanceWorkspace, type AttendanceRow } from '@/lib/attendance/types';
import { invalidateClassAttendance } from '@/lib/cache/client-cache';

import { submitMonitorAttendanceAction, loadAttendanceWorkspaceAction } from '@/app/(dashboard)/attendance/actions';

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
    case 'absent': return 'late';
    case 'late': return 'permission';
    case 'permission': return 'present';
    default: return 'present';
  }
};

const StatusButton = ({ status, onClick, disabled }: { status: AttendanceStatus, onClick: () => void, disabled?:boolean }) => {
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
    case 'late':
      bgClass='bg-amber-50 border-amber-200'; textClass='text-amber-700'; icon=<Clock className="w-4 h-4"/>;label='មកយឺត (យ)';break;
    case 'permission':
      bgClass = 'bg-purple-50 border-purple-200';
      textClass = 'text-purple-700';
      icon = <Mail className="w-4 h-4" />;
      label = 'ច្បាប់ (ច)';
      break;
  }
  
  return (
    <button 
      disabled={disabled}
      onClick={onClick} 
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border ${bgClass} ${textClass} font-black text-xs w-[115px] shadow-sm transition-transform active:scale-95 touch-manipulation cursor-pointer`}
    >
      {icon} <span>{label}</span>
    </button>
  );
};

export default function MonitorAttendancePage() {
  const {activeClass,authError,classesLoading}=useAuth();
  const searchParams=useSearchParams();
  const [selectedDate,setSelectedDate]=useState(searchParams?.get('date')||phnomPenhToday());
  const [students,setStudents]=useState<StudentRow[]>([]);
  const [baseline,setBaseline]=useState<AttendanceRow[]>([]);
  const [isSaving,setIsSaving]=useState(false),[isLoading,setIsLoading]=useState(true);
  const [missingDays,setMissingDays]=useState<string[]>([]),[showMissingBanner,setShowMissingBanner]=useState(true);
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const [loadError,setLoadError]=useState(''),[canRecord,setCanRecord]=useState(false),[dirty,setDirty]=useState(false),[reload,setReload]=useState(0);
  const busy=useRef(false),sequence=useRef(0);
  const applyWorkspace=(workspace:AttendanceWorkspace)=>{
    const saved=new Map(workspace.records.map(record=>[record.student_id,record]));
    const rows=workspace.students.map(student=>{const status=saved.get(student.id)?.status;const normalized=status?normalizeAttendance(status):'present';if(!normalized)throw new Error('ស្ថានភាពវត្តមានមិនត្រឹមត្រូវ។');return{id:student.id,name:student.name,gender:student.gender as 'M'|'F',status:normalized};});
    setStudents(rows);setBaseline(workspace.records);setMissingDays(workspace.missingDays);setCanRecord(workspace.canRecord);setDirty(false);
  };
  useEffect(()=>{
    let cancelled=false;const token=++sequence.current;setStudents([]);setBaseline([]);setDirty(false);setIsLoading(true);setLoadError('');setCanRecord(false);
    if(!activeClass?.id||!activeClass.academic_year_id){setMissingDays([]);setIsLoading(false);return;}
    void loadAttendanceWorkspaceAction({class_id:activeClass.id,academic_year_id:activeClass.academic_year_id,date:selectedDate}).then(result=>{
      if(cancelled||token!==sequence.current)return;
      if(!result.success||!result.workspace)throw new Error(result.error||'មិនអាចផ្ទុកវត្តមានបានទេ។');
      applyWorkspace(result.workspace);
    }).catch(error=>{if(!cancelled&&token===sequence.current)setLoadError(error instanceof Error?error.message:'មានបញ្ហាបណ្ដាញ។ សូមសាកម្ដងទៀត។');}).finally(()=>{if(!cancelled&&token===sequence.current)setIsLoading(false);});
    return()=>{cancelled=true;};
  },[activeClass?.id,activeClass?.academic_year_id,selectedDate,reload]);
  useEffect(()=>{
    const prevent=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
    const context=(event:Event)=>{if(busy.current || (dirty&&!confirm('មានវត្តមានមិនទាន់រក្សាទុក។ បោះបង់ការកែប្រែមែនទេ?')))event.preventDefault();};
    const focus=()=>{if(!dirty&&!busy.current)setReload(value=>value+1);};
    const navigation=(event:MouseEvent)=>{if(!dirty||event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0)return;const anchor=(event.target as Element)?.closest('a[href]');if(anchor&&new URL((anchor as HTMLAnchorElement).href).pathname!==window.location.pathname&&!confirm('បោះបង់វត្តមានមិនទាន់រក្សាទុកមែនទេ?')){event.preventDefault();event.stopPropagation();}};
    document.addEventListener('click',navigation,true);
    window.addEventListener('beforeunload',prevent);window.addEventListener('student-context-change',context);window.addEventListener('focus',focus);
    return()=>{document.removeEventListener('click',navigation,true);window.removeEventListener('beforeunload',prevent);window.removeEventListener('student-context-change',context);window.removeEventListener('focus',focus);};
  },[dirty]);
  const changeDate=(value:string)=>{if(busy.current || (dirty&&!confirm('មានវត្តមានមិនទាន់រក្សាទុក។ បោះបង់ការកែប្រែមែនទេ?')))return;setSelectedDate(value);setToast(null);};
  const handleCycle=(id:string,status:AttendanceStatus)=>{if(busy.current||isLoading||!canRecord)return;setStudents(previous=>previous.map(student=>student.id===id?{...student,status:cycleStatus(status)}:student));setDirty(true);};
  const markAllPresent=()=>{if(busy.current||isLoading||!canRecord)return;setStudents(previous=>previous.map(student=>({...student,status:'present'})));setDirty(true);};
  const handleSave=async()=>{
    if(busy.current || isLoading || !canRecord || !students.length || !activeClass?.id || !activeClass.academic_year_id)return;
    busy.current=true;setIsSaving(true);setToast(null);const token=sequence.current;
    try{
      const originals=new Map(baseline.map(record=>[record.student_id,record]));
      const result=await submitMonitorAttendanceAction({class_id:activeClass.id,academic_year_id:activeClass.academic_year_id,date:selectedDate,records:students.map(student=>({student_id:student.id,status:student.status,previous_updated_at:originals.get(student.id)?.updated_at||null,root_cause:originals.get(student.id)?.root_cause||null}))});
      if(!result.success||!result.workspace)throw new Error(result.error||'បរាជ័យក្នុងការបញ្ជូនវត្តមាន។');
      if(token!==sequence.current)return;
      applyWorkspace(result.workspace);invalidateClassAttendance(activeClass.id);window.dispatchEvent(new Event('attendance-updated'));
      setToast({message:'បញ្ជូនវត្តមានប្រចាំថ្ងៃទៅកាន់គ្រូដោយជោគជ័យ!',type:'success'});
    }catch(error){if(token===sequence.current)setToast({message:error instanceof Error?error.message:'មានបញ្ហាបណ្ដាញ។ ទិន្នន័យព្រាងនៅរក្សាទុក។',type:'error'});}
    finally{busy.current=false;setIsSaving(false);}
  };

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(student=>student.status==='late').length,
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
            ថ្នាក់ {activeClass?.name || 'មិនទាន់ជ្រើសរើស'}
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
<div className="text-center text-amber-600 font-black text-sm">{stats.late}<span className="block text-[9px] text-slate-400">យឺត</span></div>
          <button disabled={isSaving||isLoading||!canRecord} onClick={markAllPresent} className="text-[10px] font-black text-[#155EEF] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-100 transition-colors shadow-sm cursor-pointer">
            ទាំងអស់
          </button>
        </div>
      </div>

      <div className="px-5 pt-3 space-y-2"><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><CalendarIcon className="w-4 h-4"/>កាលបរិច្ឆេទ<input aria-label="កាលបរិច្ឆេទវត្តមាន" type="date" value={selectedDate} max={phnomPenhToday()} disabled={isSaving} onChange={event=>changeDate(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 min-w-0"/></label>
      {dirty&&<p className="text-xs font-bold text-amber-700">វត្តមានមិនទាន់រក្សាទុក</p>}
      {!isLoading&&!canRecord&&activeClass&&<p className="text-xs font-bold text-amber-700">កាលបរិច្ឆេទនេះក្រៅឆ្នាំសិក្សា ឬមិនអាចកត់ត្រាបានទេ។</p>}
      {(loadError||authError)&&<p role="alert" className="text-xs font-bold text-rose-600">{loadError||authError}</p>}
      <button type="button" disabled={isSaving||isLoading} onClick={()=>{if(!dirty||confirm('បោះបង់ទិន្នន័យព្រាង ហើយផ្ទុកវត្តមានថ្មីមែនទេ?'))setReload(value=>value+1);}} className="text-xs font-bold text-[#155EEF]">ផ្ទុកវត្តមានថ្មី</button></div>
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
                      onClick={() => changeDate(d)}
                      className="px-3.5 py-1.5 bg-white border border-rose-100 shadow-sm rounded-lg text-rose-600 text-xs font-bold hover:bg-rose-50 hover:border-rose-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                      {new Date(d).toLocaleDateString('km-KH', { timeZone:'Asia/Phnom_Penh',weekday: 'short', day: 'numeric', month: 'short' })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student List */}
        {isLoading||classesLoading ? (
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
        ) : students.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 p-8 text-center flex flex-col items-center justify-center my-auto shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
            <h3 className="font-extrabold text-slate-700 text-sm mb-1">
              {!activeClass?.id ? 'មិនទាន់បានចាត់ថ្នាក់ឱ្យអ្នកទេ' : 'មិនទាន់មានទិន្នន័យសិស្សក្នុងថ្នាក់នេះនៅឡើយទេ'}
            </h3>
            <p className="text-xs text-slate-400 font-bold">
              {!activeClass?.id ? 'សូមទាក់ទងអ្នកគ្រប់គ្រងដើម្បីចាត់ថ្នាក់' : 'សូមទាក់ទងអ្នកគ្រប់គ្រងដើម្បីបញ្ចូលឈ្មោះសិស្ស'}
            </p>
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
                  <StatusButton disabled={isSaving||!canRecord} status={student.status} onClick={() => handleCycle(student.id, student.status)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed sm:absolute bottom-6 left-0 right-0 max-w-md mx-auto px-4 pointer-events-none z-20">
         <button 
           onClick={handleSave}
           disabled={isSaving||isLoading||!canRecord||!students.length}
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
