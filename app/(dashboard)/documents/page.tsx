'use client';

import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, FileText, Printer, FileSpreadsheet, 
  BarChart2, Award, Download, Users, FileCheck, CheckSquare,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Student, AcademicYear } from '@/types';
import { getCurriculumSchemaForClass } from '@/lib/curriculum';
import { computeSummaryGrades } from '@/lib/domain/grading';

// Print Modals
import { ClassRosterExportModal } from '@/components/documents/ClassRosterExportModal';
import { ProfilingSummaryExportModal } from '@/components/documents/ProfilingSummaryExportModal';
import { AttendanceExportModal } from '@/components/documents/AttendanceExportModal';
import { GeipExportModal } from '@/components/grades/GeipExportModal';
import { HonorRollExportModal } from '@/components/grades/HonorRollExportModal';

// Templates
import { printInternalRegulations, printLeaveRequestSlip, printDisciplinaryForm } from '@/components/documents/SchoolTemplatesPrint';

export default function DocumentsPage() {
  const { activeClass, profile, activeAcademicYear } = useAuth();
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<'live' | 'templates'>('live');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, number>>>({});

  // Modals state
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isGeipOpen, setIsGeipOpen] = useState(false);
  const [isHonorRollOpen, setIsHonorRollOpen] = useState(false);

  // GEIP configuration
  const activeSchema = getCurriculumSchemaForClass(activeClass?.grade, activeClass?.track);
  const maxTotalScore = activeSchema.subjects.reduce((sum, sub) => sum + sub.maxScore, 0);

  useEffect(() => {
    if (activeClass?.id) {
      fetchLiveClassData();
    }
  }, [activeClass?.id]);

  const fetchLiveClassData = async () => {
    if (!activeClass) return;
    setLoading(true);
    
    // Fetch Active Class Roster
    const { data: rosterData } = await supabase
      .from('active_class_rosters')
      .select('*')
      .eq('enrollment_class_id', activeClass.id);

    // Map to Student type format
    const formattedStudents: Student[] = (rosterData || []).map(r => ({
      id: r.id,
      full_name: r.full_name,
      student_id_number: r.student_id_number,
      gender: r.gender,
      date_of_birth: r.date_of_birth,
      current_address: r.current_address,
      guardian_name: r.guardian_name,
      father_name: r.father_name,
      mother_name: r.mother_name,
      guardian_phone: r.guardian_phone,
      father_phone: r.father_phone,
      mother_phone: r.mother_phone,
      id_poor: r.id_poor,
      poor_id_status: r.poor_id_status,
      status: r.status,
      orphan: r.orphan,
      is_orphan: r.is_orphan,
      indigenous: r.indigenous,
      disability: r.disability,
      is_active: true,
      is_slow_learner: r.is_slow_learner,
      class_id: r.enrollment_class_id
    }));

    setStudents(formattedStudents);

    // Also fetch grades for GEIP master matrix
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthKey = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][new Date().getMonth()];
    
    const { data: gradesData } = await supabase
      .from('grades')
      .select('student_id, period, scores')
      .eq('class_id', activeClass.id)
      .eq('period', monthKey)
      .eq('status', 'published');

    const flatColumns = activeSchema.subjects.flatMap(sub => {
      const cols = [];
      if (sub.subMetrics) sub.subMetrics.forEach(metric => cols.push(`${sub.id}_${metric.id}`));
      cols.push(sub.id);
      return cols;
    });

    const newMap: Record<string, Record<string, number>> = {};
    if (gradesData) {
      formattedStudents.forEach(s => {
        newMap[s.id] = computeSummaryGrades(gradesData, s.id, monthKey, flatColumns, activeSchema);
      });
    }
    setMatrixData(newMap);
    
    setLoading(false);
  };

  const getPeriodLabel = () => {
    const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    return `ខែ${months[new Date().getMonth()]}`;
  };
  const periodKey = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][new Date().getMonth()];

  const isEmpty = students.length === 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <FolderOpen className="w-8 h-8 text-[#155EEF]" />
            <span>មជ្ឈមណ្ឌលឯកសារ</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1 flex items-center gap-1.5">
            <span>• ទាញយករបាយការណ៍ និងទម្រង់រដ្ឋបាលផ្លូវការ</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'live' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <FileCheck className="w-4 h-4" /> ឯកសារថ្នាក់រៀនផ្ទាល់
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'templates' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Download className="w-4 h-4" /> ឯកសារគំរូរដ្ឋបាលផ្លូវការ
        </button>
      </div>

      {/* Empty State Guard for Live Documents */}
      {activeTab === 'live' && isEmpty && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-black text-amber-800 mb-2">មិនទាន់មានទិន្នន័យសិស្សសម្រាប់ថ្នាក់នេះទេ</h3>
          <p className="text-sm font-medium text-amber-700">សូមបញ្ចូលទិន្នន័យសិស្ស និងពិន្ទុជាមុនសិន ទើបអាចទាញយករបាយការណ៍ផ្លូវការបាន។</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-transparent border-0">
        
        {/* Tab 1: Live Documents */}
        {activeTab === 'live' && !isEmpty && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">បញ្ជីរាយនាមសិស្សផ្លូវការប្រចាំថ្នាក់</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  របាយការណ៍បញ្ជីរាយនាមសិស្សរួមមានព័ត៌មានផ្ទាល់ខ្លួន ទីលំនៅ និងបណ្ណក្រីក្រ។
                </p>
              </div>
              <button onClick={() => setIsRosterOpen(true)} className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <Printer className="w-4 h-4" /> Export / Print A4
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">របាយការណ៍ស្ថិតិជីវប្រវត្តិសិស្ស</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  សរុបស្ថិតិសិស្សក្រីក្រ សិស្សកំព្រា ពិការភាព និងសិស្សត្រួតថ្នាក់សម្រាប់ការគ្រប់គ្រង។
                </p>
              </div>
              <button onClick={() => setIsProfileOpen(true)} className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <Printer className="w-4 h-4" /> Export / Print A4
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">បញ្ជីវត្តមានសិស្សប្រចាំខែ</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  បញ្ជីវត្តមានសិស្សប្រចាំខែ (៣១ ថ្ងៃ) ស្រង់ចេញពីទិន្នន័យជាក់ស្ដែងដោយស្វ័យប្រវត្តិ។
                </p>
              </div>
              <button onClick={() => setIsAttendanceOpen(true)} className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <Printer className="w-4 h-4" /> Export / Print A4
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">តារាងលទ្ធផលសិក្សា និងចំណាត់ថ្នាក់</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  តារាង GEIP ៣.១.៤ (Master Score Sheet) សម្រាប់បូកសរុបលទ្ធផលប្រចាំខែ ឬឆមាស។
                </p>
              </div>
              <button onClick={() => setIsGeipOpen(true)} className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" /> Export GEIP A4
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">តារាងកិត្តិយសសិស្សពូកែ</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  បញ្ជីរាយនាមសិស្សពូកែ Top 5, Top 10 ប្រចាំខែ ឬប្រចាំឆមាស។
                </p>
              </div>
              <button onClick={() => setIsHonorRollOpen(true)} className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <Award className="w-4 h-4" /> Export Honor Roll
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Templates */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 border border-slate-200">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">បទបញ្ជាផ្ទៃក្នុងសាលារៀន</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  ឯកសារបទបញ្ជាផ្ទៃក្នុង និងវិន័យសម្រាប់សិស្សានុសិស្សទូទៅ។
                </p>
              </div>
              <button onClick={printInternalRegulations} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <Printer className="w-4 h-4" /> Print A4 Template
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 border border-slate-200">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">គំរូលិខិតសុំច្បាប់ឈប់សម្រាក</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  ទម្រង់ស្នើសុំច្បាប់សម្រាប់មាតាបិតាបំពេញពេលកូនឈប់សម្រាក (កាត់ A5)។
                </p>
              </div>
              <button onClick={printLeaveRequestSlip} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <Printer className="w-4 h-4" /> Print A4 Template
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 border border-slate-200">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">គំរូកិច្ចសន្យាសិស្សកែលម្អកំហុស</h3>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                  ទម្រង់កិច្ចសន្យាអប់រំសម្រាប់សិស្សប្រព្រឹត្តខុសបទបញ្ជាផ្ទៃក្នុងសាលា។
                </p>
              </div>
              <button onClick={printDisciplinaryForm} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer">
                <Printer className="w-4 h-4" /> Print A4 Template
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Modals Mounting */}
      <ClassRosterExportModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        className={activeClass?.name || ''}
        classId={activeClass?.id || ''}
        students={students}
        teacherName={profile?.full_name || '........................'}
        academicYear={activeAcademicYear}
      />
      
      <ProfilingSummaryExportModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        className={activeClass?.name || ''}
        classId={activeClass?.id || ''}
        students={students}
        teacherName={profile?.full_name || '........................'}
        academicYear={activeAcademicYear}
      />

      <AttendanceExportModal
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        className={activeClass?.name || ''}
        classId={activeClass?.id || ''}
        students={students}
        teacherName={profile?.full_name || '........................'}
        academicYear={activeAcademicYear}
      />

      <GeipExportModal
        isOpen={isGeipOpen}
        onClose={() => setIsGeipOpen(false)}
        className={activeClass?.name || ''}
        periodLabel={getPeriodLabel()}
        periodKey={periodKey}
        students={students}
        matrixData={matrixData}
        activeSchema={activeSchema}
        maxTotalScore={maxTotalScore}
      />

      <HonorRollExportModal
        isOpen={isHonorRollOpen}
        onClose={() => setIsHonorRollOpen(false)}
        className={activeClass?.name || ''}
        classId={activeClass?.id || ''}
        students={students}
        activeSchema={activeSchema}
        teacherName={profile?.full_name || '........................'}
        academicYear={activeAcademicYear}
      />

    </div>
  );
}
