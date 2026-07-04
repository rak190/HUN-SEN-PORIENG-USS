'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  Save, 
  Send,
  Users
} from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'permission';

interface StudentRow {
  id: string;
  name: string;
  gender: 'M' | 'F';
  status: AttendanceStatus;
}

const MOCK_STUDENTS: StudentRow[] = [
  { id: '1', name: 'កែវ ច័ន្ទធីតា', gender: 'F', status: 'present' },
  { id: '2', name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', status: 'present' },
  { id: '3', name: 'ចាន់ សុភាព', gender: 'M', status: 'present' },
  { id: '4', name: 'ជួន ស្រីរ័ត្ន', gender: 'F', status: 'present' },
  { id: '5', name: 'ដួង វិចិត្រ', gender: 'M', status: 'present' },
  { id: '6', name: 'សៅ សុភាព', gender: 'F', status: 'present' },
  { id: '7', name: 'សុខ មករា', gender: 'M', status: 'present' },
  { id: '8', name: 'ម៉ៅ រស្មី', gender: 'F', status: 'present' },
];

export default function MonitorAttendancePage() {
  const { activeClass, profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>(MOCK_STUDENTS);
  const [todayDate, setTodayDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Format date in Khmer
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setTodayDate(new Date().toLocaleDateString('km-KH', options));
  }, []);

  const handleStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setStudents(prev => 
      prev.map(s => s.id === id ? { ...s, status: newStatus } : s)
    );
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
  };

  const handleSave = async (type: 'draft' | 'submit') => {
    setIsSaving(true);
    
    if (type === 'submit') {
      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            className: activeClass?.name || '12 ក',
            students
          })
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        alert('បញ្ជូនវត្តមានប្រចាំថ្ងៃទៅកាន់គ្រូ (និង Google Sheets) ដោយជោគជ័យ!');
      } catch (error) {
        console.error('Failed to submit to Google Sheets:', error);
        alert('មានកំហុសក្នុងការបញ្ជូនទិន្នន័យ។ សូមសាកល្បងម្តងទៀត។');
      }
    } else {
      setTimeout(() => {
        alert('ព្រាងទុកដោយជោគជ័យ! (Saved Draft)');
      }, 500);
    }
    
    setIsSaving(false);
  };

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    permission: students.filter(s => s.status === 'permission').length,
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-[85vh] rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col relative">
      
      {/* Mobile-Friendly Header */}
      <div className="bg-[#155EEF] text-white p-6 rounded-t-[32px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-200" />
            <span className="font-bold text-sm text-blue-100">{todayDate}</span>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-black backdrop-blur-sm">
            ថ្នាក់ {activeClass?.name || '12 ក'}
          </div>
        </div>
        
        <h1 className="text-2xl font-black mb-1">ស្រង់វត្តមាន</h1>
        <p className="text-blue-100 text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4" /> សិស្សសរុប {students.length} នាក់
        </p>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          <div className="bg-emerald-500/20 rounded-xl p-2 text-center border border-emerald-400/30">
            <div className="text-xl font-black">{stats.present}</div>
            <div className="text-[10px] font-bold text-emerald-100">វត្តមាន</div>
          </div>
          <div className="bg-rose-500/20 rounded-xl p-2 text-center border border-rose-400/30">
            <div className="text-xl font-black">{stats.absent}</div>
            <div className="text-[10px] font-bold text-rose-100">អវត្តមាន</div>
          </div>
          <div className="bg-amber-500/20 rounded-xl p-2 text-center border border-amber-400/30">
            <div className="text-xl font-black">{stats.late}</div>
            <div className="text-[10px] font-bold text-amber-100">យឺត</div>
          </div>
          <div className="bg-purple-500/20 rounded-xl p-2 text-center border border-purple-400/30">
            <div className="text-xl font-black">{stats.permission}</div>
            <div className="text-[10px] font-bold text-purple-100">ច្បាប់</div>
          </div>
        </div>
      </div>

      {/* Global Actions */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <span className="text-sm font-bold text-slate-600">បញ្ជីឈ្មោះសិស្ស</span>
        <button 
          onClick={markAllPresent}
          className="text-xs font-black text-[#155EEF] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
        >
          វត្តមានទាំងអស់ (Mark All P)
        </button>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {students.map((student, index) => (
          <div key={student.id} className="p-4 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${student.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                {index + 1}
              </div>
              <span className="font-black text-slate-800 flex-1">{student.name}</span>
            </div>
            
            {/* Mobile Tap Targets for Status */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleStatusChange(student.id, 'present')}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl border-2 transition-all ${
                  student.status === 'present' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm scale-105' 
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-black uppercase">P</span>
              </button>

              <button 
                onClick={() => handleStatusChange(student.id, 'absent')}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl border-2 transition-all ${
                  student.status === 'absent' 
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm scale-105' 
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-black uppercase">A</span>
              </button>

              <button 
                onClick={() => handleStatusChange(student.id, 'late')}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl border-2 transition-all ${
                  student.status === 'late' 
                    ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm scale-105' 
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-black uppercase">L</span>
              </button>

              <button 
                onClick={() => handleStatusChange(student.id, 'permission')}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl border-2 transition-all ${
                  student.status === 'permission' 
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm scale-105' 
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Mail className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-black uppercase">E</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] rounded-b-[32px]">
        <button 
          onClick={() => handleSave('draft')}
          disabled={isSaving}
          className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> ព្រាង
        </button>
        <button 
          onClick={() => handleSave('submit')}
          disabled={isSaving}
          className="flex-[2] py-3.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          {isSaving ? 'កំពុងបញ្ជូន...' : <><Send className="w-4 h-4" /> បញ្ជូនទៅគ្រូ</>}
        </button>
      </div>

    </div>
  );
}
