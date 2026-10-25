import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, User, MapPin, Phone, Calendar, AlertCircle, Home, 
  CheckCircle2, Edit2, ShieldAlert, Award, Heart, Accessibility 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HomeVisit } from '@/types';
import AdminEditStudentModal from './AdminEditStudentModal';
import { formatDobForDisplay } from '@/lib/utils/student-date';

interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onUpdate?: (updatedStudent: any) => void;
}

export default function StudentProfileDrawer({ isOpen, onClose, student, onUpdate }: StudentProfileDrawerProps) {
  const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);
  const [fullStudent, setFullStudent] = useState<any>(student);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    setFullStudent(student);

    const fetchDeepData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // 1. Fetch home visits
        const { data: visits } = await supabase
          .from('home_visits')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });

        setHomeVisits(visits || []);

        // 2. Fetch full student profile from canonical students table
        const { data: profile } = await supabase
          .from('students')
          .select('*')
          .eq('id', student.id)
          .maybeSingle();

        // 3. Fetch active enrollment for desk and room seating
        const { data: enrollment } = await supabase
          .from('student_enrollments')
          .select('desk_number, room_number')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (profile) {
          setFullStudent((prev: any) => ({
            ...prev,
            ...profile,
            class_name: prev?.class_name || student.class_name,
            homeroom_teacher: prev?.homeroom_teacher || student.homeroom_teacher,
            desk_number: enrollment?.desk_number ?? prev?.desk_number ?? student.desk_number ?? '',
            room_number: enrollment?.room_number ?? prev?.room_number ?? student.room_number ?? '',
          }));
        }
      } catch (err) {
        console.error('Error fetching deep student data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeepData();
  }, [isOpen, student]);

  if (!isOpen || !student || !mounted) return null;

  const current = fullStudent || student;
  const dobDisplay = current.dob || current.date_of_birth;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Full-Screen Frosted Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-md animate-overlayFade select-none"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
        
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 p-5 sm:p-6 bg-slate-50/70 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {current.photo_url ? (
              <img 
                src={current.photo_url} 
                alt={current.full_name} 
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-400 text-2xl uppercase shrink-0">
                {current.full_name?.substring(0, 1) || 'S'}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">{current.full_name}</h2>
              {(current.english_name || current.latin_name) && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
                  {current.english_name || current.latin_name}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {current.student_id_number || 'គ្មានអត្តលេខ'}
                </span>
                {current.is_active !== false ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">សកម្ម</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">ផ្អាក</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#155EEF] hover:bg-[#124bbf] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#155EEF]/20 active:scale-95"
              title="កែប្រែព័ត៌មានសិស្ស"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>កែប្រែ</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ថ្នាក់</p>
              <p className="font-extrabold text-slate-800 text-sm">{current.class_name || 'គ្មានថ្នាក់'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ភេទ</p>
              <p className="font-extrabold text-slate-800 text-sm">{current.gender || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">គ្រូបន្ទុកថ្នាក់</p>
              <p className="font-bold text-slate-700 text-sm truncate">{current.homeroom_teacher || 'មិនទាន់កំណត់'}</p>
            </div>
            <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">លេខតុ (Desk)</p>
              <p className="font-black text-[#155EEF] text-base leading-none">{current.desk_number || 'គ្មាន'}</p>
            </div>
            <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100 sm:col-span-2">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">លេខបន្ទប់ប្រឡង (Exam Room)</p>
              <p className="font-black text-emerald-700 text-base leading-none">{current.room_number || 'មិនទាន់កំណត់'}</p>
            </div>
          </div>

          {/* Identity & Demographics */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <User className="w-4 h-4 text-[#155EEF]" />
              <h3 className="font-bold text-slate-800 text-sm">ព័ត៌មានអត្តសញ្ញាណ</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ឈ្មោះខ្មែរ</p>
                <p className="font-bold text-slate-800">{current.full_name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ឈ្មោះឡាតាំង</p>
                <p className="font-bold text-slate-800">{current.english_name || current.latin_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">អត្តលេខសិស្ស</p>
                <p className="font-bold text-slate-800">{current.student_id_number || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ថ្ងៃខែឆ្នាំកំណើត (DD MM YYYY)</p>
                <p className="font-bold text-slate-800">
                  {dobDisplay ? formatDobForDisplay(dobDisplay) : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Family & Contact Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Phone className="w-4 h-4 text-[#155EEF]" />
              <h3 className="font-bold text-slate-800 text-sm">ទំនាក់ទំនង និងក្រុមគ្រួសារ</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ទូរស័ព្ទអាណាព្យាបាល</p>
                <p className="font-bold text-slate-800">{current.parent_phone || current.phone_number || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ទូរស័ព្ទបន្ទាន់</p>
                <p className="font-bold text-slate-800">{current.emergency_phone || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ឪពុក</p>
                <p className="font-bold text-slate-800">{current.father_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ម្តាយ</p>
                <p className="font-bold text-slate-800">{current.mother_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">អាណាព្យាបាល</p>
                <p className="font-bold text-slate-800">{current.guardian_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">ចម្ងាយមកសាលា</p>
                <p className="font-bold text-slate-800">{current.distance_to_school_km ? `${current.distance_to_school_km} គ.ម` : '-'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-400 font-semibold mb-0.5">អាសយដ្ឋានបច្ចុប្បន្ន</p>
                <p className="font-bold text-slate-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{current.address || '-'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Socio-Economic & Needs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Award className="w-4 h-4 text-[#155EEF]" />
              <h3 className="font-bold text-slate-800 text-sm">ស្ថានភាពសង្គម-សេដ្ឋកិច្ច និងសុខភាព</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className={`p-2.5 rounded-xl border text-xs ${
                current.is_id_poor ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-600'
              }`}>
                <p className="text-[10px] font-semibold text-slate-400">បណ្ណក្រីក្រ (ID-Poor)</p>
                <p className="font-bold mt-0.5">{current.is_id_poor ? 'មានបណ្ណក្រីក្រ' : 'គ្មាន'}</p>
              </div>
              <div className={`p-2.5 rounded-xl border text-xs ${
                current.is_scholarship ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-100 text-slate-600'
              }`}>
                <p className="text-[10px] font-semibold text-slate-400">អាហារូបករណ៍</p>
                <p className="font-bold mt-0.5">{current.is_scholarship ? 'ទទួលបាន' : 'គ្មាន'}</p>
              </div>
              <div className={`p-2.5 rounded-xl border text-xs ${
                current.is_orphan ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-slate-50 border-slate-100 text-slate-600'
              }`}>
                <p className="text-[10px] font-semibold text-slate-400">កុមារកំព្រា</p>
                <p className="font-bold mt-0.5">{current.is_orphan ? 'កុមារកំព្រា' : 'ទូទៅ'}</p>
              </div>
            </div>

            {(current.disability_type || current.special_education_needs) && (
              <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                {current.disability_type && (
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-500">ពិការភាព៖</span> {current.disability_type}
                  </p>
                )}
                {current.special_education_needs && (
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-500">តម្រូវការអប់រំពិសេស៖</span> {current.special_education_needs}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Deep Data: Home Visits */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Home className="w-4 h-4 text-[#155EEF]" /> ប្រវត្តិចុះតាមដាន (Home Visits)
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
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
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <Home className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-500">មិនទាន់មានប្រវត្តិចុះតាមដានទេ</p>
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Admin Edit Student Modal */}
      <AdminEditStudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={current}
        onSuccess={(updatedStudent) => {
          setFullStudent((prev: any) => ({
            ...prev,
            ...updatedStudent,
          }));
          if (onUpdate) {
            onUpdate(updatedStudent);
          }
        }}
      />
    </div>,
    document.body
  );
}

