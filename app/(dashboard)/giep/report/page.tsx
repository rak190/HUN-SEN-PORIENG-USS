import React from 'react';
import { createClient } from '@/lib/supabase/server';
import GeipReportClient from './GeipReportClient';

export const dynamic = 'force-dynamic';

export default async function GeipReportPage() {
  const supabase = await createClient();

  // 1. Fetch School & Profiles
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', 'main-school')
    .maybeSingle();

  const { data: principalProfile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('role', 'principal')
    .limit(1)
    .maybeSingle();

  const { data: ictAdminProfile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  // 2. Fetch Classes
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name, grade');
  const classes = classesData || [];

  // 3. Fetch Students
  const { data: studentsData } = await supabase
    .from('students')
    .select('id, class_id, full_name, gender, is_active, dob');
  const students = studentsData || [];

  // 4. Fetch Grades for test participation summary
  const { data: gradesData } = await supabase
    .from('grades')
    .select('period, class_id, student_id, total_score, status');
  const grades = gradesData || [];

  // Aggregate School-Wide Stats
  const totalStudents = students.length;
  const femaleStudents = students.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
  const activeStudents = students.filter(s => s.is_active !== false).length;
  const activeFemaleStudents = students.filter(s => (s.gender === 'F' || s.gender === 'ស្រី') && s.is_active !== false).length;
  const dropoutStudents = totalStudents - activeStudents;
  const dropoutFemaleStudents = femaleStudents - activeFemaleStudents;

  // Grade Level Breakdown (7 to 12)
  const gradeLevels = ['12', '11', '10', '9', '8', '7'];
  const gradeBreakdowns = gradeLevels.map(grade => {
    const gradeClasses = classes.filter(c => c.grade === grade || c.name.includes(grade));
    const gradeClassIds = gradeClasses.map(c => c.id);
    const gradeStudents = students.filter(s => s.class_id && gradeClassIds.includes(s.class_id));
    
    const total = gradeStudents.length;
    const female = gradeStudents.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
    const active = gradeStudents.filter(s => s.is_active !== false).length;
    const activeFemale = gradeStudents.filter(s => (s.gender === 'F' || s.gender === 'ស្រី') && s.is_active !== false).length;
    const dropout = total - active;
    const dropoutFemale = female - activeFemale;

    const gradeGrades = grades.filter(g => gradeClassIds.includes(g.class_id));
    const avgScore = gradeGrades.length > 0
      ? Number((gradeGrades.reduce((sum, g) => sum + (g.total_score || 0), 0) / gradeGrades.length).toFixed(2))
      : 0;

    return {
      grade: `ថ្នាក់ទី ${grade}`,
      classesCount: gradeClasses.length,
      total,
      female,
      active,
      activeFemale,
      dropout,
      dropoutFemale,
      avgScore,
    };
  });

  return (
    <GeipReportClient
      schoolInfo={{
        name: school?.name || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង',
        code: school?.code || 'Porieng-386',
        region: 'តំបន់៥ (ខេត្តព្រៃវែង)',
        projectType: 'GEIP / SEIP (IDA.No.7024-KH)',
        principalName: principalProfile?.full_name || 'ហេង ឈាងលី',
        principalPhone: principalProfile?.phone || '096 689 4077',
        ictAdminName: ictAdminProfile?.full_name || 'សាន សុវិជ្ជា',
        ictAdminPhone: ictAdminProfile?.phone || '093 690 905',
        academicYear: '២០២៥-២០២៦',
      }}
      summaryStats={{
        totalStudents,
        femaleStudents,
        activeStudents,
        activeFemaleStudents,
        dropoutStudents,
        dropoutFemaleStudents,
      }}
      gradeBreakdowns={gradeBreakdowns}
      totalClasses={classes.length}
    />
  );
}
