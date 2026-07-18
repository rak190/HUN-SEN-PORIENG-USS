'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Printer, User as UserIcon, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import StudentRecordBook from './StudentRecordBook';
import { createClient } from '@/lib/supabase/client';
import { Student } from '@/types';

const DEMO_STUDENTS: Student[] = [
  { id: 'std-1', class_id: 'demo-class-1', student_id_number: 'ID-001', full_name: 'កែវ ច័ន្ទធីតា', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-2', class_id: 'demo-class-1', student_id_number: 'ID-002', full_name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-3', class_id: 'demo-class-1', student_id_number: 'ID-003', full_name: 'ចាន់ សុភាព', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-4', class_id: 'demo-class-1', student_id_number: 'ID-004', full_name: 'ដួង រដ្ឋា', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-5', class_id: 'demo-class-1', student_id_number: 'ID-005', full_name: 'ទិត្យ វិសាល', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-6', class_id: 'demo-class-1', student_id_number: 'ID-006', full_name: 'ប៊ុន រស្មី', gender: 'F', is_active: true, created_at: new Date().toISOString() },
];

export default function StudentRecordsPage() {
  const { activeClass } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!activeClass?.id) return;
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', activeClass.id)
          .order('full_name', { ascending: true });
          
        if (error || !data || data.length === 0) {
          if (error) console.warn("Could not fetch real students, falling back to demo data:", error);
          
          // Fallback to DEMO data
          setStudents(DEMO_STUDENTS);
          setSelectedStudentId(DEMO_STUDENTS[0].id);
        } else {
          // Use real data
          setStudents(data);
          setSelectedStudentId(data[0].id);
        }
      } catch (err) {
        console.warn("Failed to load students, using demo data");
        setStudents(DEMO_STUDENTS);
        setSelectedStudentId(DEMO_STUDENTS[0].id);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [activeClass?.id]);

  if (!activeClass) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p>Please select a class first.</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAll = () => {
    setIsPrintingAll(true);
    // Give React time to render all components before printing
    setTimeout(() => {
      window.print();
      setIsPrintingAll(false);
    }, 500);
  };

  const currentIndex = students.findIndex(s => s.id === selectedStudentId);
  const nextStudent = () => {
    if (currentIndex < students.length - 1) setSelectedStudentId(students[currentIndex + 1].id);
  };
  const prevStudent = () => {
    if (currentIndex > 0) setSelectedStudentId(students[currentIndex - 1].id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 print:p-0 print:m-0 print:pb-0">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm !important;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="flex items-center justify-between print:hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">សៀវភៅសិក្ខាគារិក (Student Record Book)</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">ថ្នាក់ទី {activeClass.name} • ឆ្នាំសិក្សា ២០២៥-២០២៦</p>
        </div>

        <div className="flex items-center gap-3">
          {students.length > 0 && (
            <>
              <div className="flex items-center gap-1">
                <button 
                  onClick={prevStudent}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={nextStudent}
                  disabled={currentIndex >= students.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 mr-2">
                <UserIcon className="w-4 h-4 text-slate-400 ml-2" />
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer pr-4"
                >
                  {students.map(std => (
                    <option key={std.id} value={std.id}>{std.student_id_number ? `${std.student_id_number} - ` : ''}{std.full_name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                បោះពុម្ព (Print)
              </button>
              <button
                onClick={handlePrintAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#155EEF] text-white text-sm font-bold rounded-xl hover:bg-[#155EEF]/90 transition-colors shadow-sm shadow-[#155EEF]/20"
              >
                <Printer className="w-4 h-4" />
                បោះពុម្ពទាំងអស់ (Print All)
              </button>
            </div>
          </div>
        </div>

        {/* The Printable Report Component */}
        <div className="bg-slate-200/50 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto print:bg-transparent print:border-none print:shadow-none print:rounded-none print:overflow-visible py-12 px-8 flex justify-center print:p-0 print:block">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold">កំពុងទាញយកទិន្នន័យសិស្ស...</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-bold">មិនមានទិន្នន័យសិស្សទេ (No students found)</div>
          ) : (
            <>
              {/* Single view for screen, hidden when batch printing */}
              <div className={isPrintingAll ? "hidden" : "block"}>
                <StudentRecordBook 
                  classInfo={activeClass} 
                  student={students.find(s => s.id === selectedStudentId) || students[0]}
                  allStudents={students}
                />
              </div>

              {/* Batch view, only rendered when printing all */}
              {isPrintingAll && (
                <div className="print:block hidden">
                  {students.map((std, index) => (
                    <div key={std.id} className={index !== students.length - 1 ? "print:break-after-page" : ""}>
                      <StudentRecordBook 
                        classInfo={activeClass} 
                        student={std}
                        allStudents={students}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
}
