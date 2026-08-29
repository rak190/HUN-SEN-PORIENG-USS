import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, MapPin, Phone, Calendar, AlertCircle, Home, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HomeVisit } from '@/types';

interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export default function StudentProfileDrawer({ isOpen, onClose, student }: StudentProfileDrawerProps) {
  const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    if (!isOpen || !student) return;

    const fetchDeepData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // Fetch home visits
        const { data: visits, error } = await supabase
          .from('home_visits')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setHomeVisits(visits || []);
        
      } catch (err) {
        console.error('Error fetching deep student data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeepData();
  }, [isOpen, student]);

  if (!isOpen || !student || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Full-Screen Frosted Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-md animate-overlayFade select-none"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
        
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 p-6 bg-slate-50/50 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-400 text-2xl uppercase">
              {student.full_name.substring(0, 1)}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{student.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {student.student_id_number || 'គ្មានអត្តលេខ'}
                </span>
                {student.is_active ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">សកម្ម</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">ផ្អាក</span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ថ្នាក់</p>
              <p className="font-extrabold text-slate-700">{student.class_name}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ភេទ</p>
              <p className="font-extrabold text-slate-700">{student.gender}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">គ្រូបន្ទុកថ្នាក់</p>
              <p className="font-bold text-slate-700 truncate">{student.homeroom_teacher}</p>
            </div>
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">ប្លង់តុ (Desk)</p>
              <p className="font-black text-[#155EEF] text-lg leading-none">{student.desk_number || 'គ្មាន'}</p>
            </div>
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 sm:col-span-2">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">លេខបន្ទប់ប្រឡង (Exam Room)</p>
              <p className="font-black text-emerald-700 text-lg leading-none">{student.room_number || 'មិនទាន់កំណត់'}</p>
            </div>
          </div>

          {/* Deep Data: Home Visits */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#155EEF]" /> ប្រវត្តិចុះតាមដាន (Home Visits)
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                {homeVisits.length}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 animate-pulse">
                <p className="text-sm font-bold text-slate-400">កំពុងផ្ទុក...</p>
              </div>
            ) : homeVisits.length > 0 ? (
              <div className="space-y-3">
                {homeVisits.map((visit) => (
                  <div key={visit.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#155EEF]/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">
                          {new Date(visit.date || visit.created_at || Date.now()).toLocaleDateString('km-KH')}
                        </span>
                      </div>
                      {visit.status === 'submitted' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="font-bold text-slate-800 text-sm mb-1">{visit.reason}</p>
                    <p className="text-xs text-slate-500 font-medium">អ្នកអាណាព្យាបាល៖ {visit.parent_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <Home className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">មិនទាន់មានប្រវត្តិចុះតាមដានទេ</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>,
    document.body
  );
}
