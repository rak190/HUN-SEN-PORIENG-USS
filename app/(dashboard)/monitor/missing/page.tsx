'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MissingDaysPage() {
  const { activeClass } = useAuth();
  const [missingDays, setMissingDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkMissingDays() {
      setIsLoading(true);
      if (!activeClass?.id) {
        // Mock data for UI testing
        const mockPast = new Date();
        mockPast.setDate(mockPast.getDate() - 2);
        const mockPast2 = new Date();
        mockPast2.setDate(mockPast2.getDate() - 3);
        setMissingDays([mockPast.toISOString().split('T')[0], mockPast2.toISOString().split('T')[0]]);
        setIsLoading(false);
        return;
      }
      
      const today = new Date();
      const pastDays: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          pastDays.push(d.toISOString().split('T')[0]);
        }
      }

      if (pastDays.length === 0) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('attendance_records')
        .select('date')
        .eq('class_id', activeClass.id)
        .in('date', pastDays);

      const recordedDates = new Set(data?.map(r => r.date) || []);
      const missing = pastDays.filter(d => !recordedDates.has(d));
      
      if (missing.length === 7) {
         setMissingDays(missing.slice(0, 2));
      } else {
         setMissingDays(missing);
      }
      setIsLoading(false);
    }
    checkMissingDays();
  }, [activeClass?.id]);

  const handleDayClick = (dateStr: string) => {
    router.push(`/monitor/attendance?date=${dateStr}`);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col font-sans sm:rounded-[32px] sm:shadow-2xl sm:border border-slate-200 overflow-hidden pb-12 sm:pb-0">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pt-6 pb-4 px-5 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">ថ្ងៃដែលមិនទាន់ស្រង់</h1>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold mt-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-600">ចាំបាច់ត្រូវបំពេញ</span>
            </div>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-700 border border-slate-200 shadow-sm">
            ថ្នាក់ {activeClass?.name || '12 ក'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white h-16 rounded-2xl border border-slate-200 animate-pulse shadow-sm"></div>
            ))}
          </div>
        ) : missingDays.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-500 mb-4 px-1">
              សូមជ្រើសរើសថ្ងៃខាងក្រោមដើម្បីស្រង់អវត្តមានដែលបានរំលង៖
            </p>
            {missingDays.map(d => {
              const dateObj = new Date(d);
              const formatted = dateObj.toLocaleDateString('km-KH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              
              return (
                <button 
                  key={d}
                  onClick={() => handleDayClick(d)}
                  className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group flex items-center justify-between text-left active:scale-[0.98] cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500"></div>
                  <div className="flex items-center gap-3 pl-2">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">{formatted}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">{d}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-lg font-black text-slate-800 mb-2">ល្អណាស់!</h2>
            <p className="text-sm font-bold text-slate-500">
              អ្នកបានស្រង់អវត្តមានគ្រប់ថ្ងៃទាំងអស់សម្រាប់សប្តាហ៍នេះ។
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
