'use server';

import { createClient } from '@/lib/supabase/server';

export async function fetchPrincipalDashboardData() {
  try {
    const supabase = await createClient();
    
    // 1. Fetch Students
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, gender, risk_level, full_name, class_id, behavior_history, classes(grade)');

    if (studentsError) throw studentsError;

    // 2. Fetch Grades
    const { data: gradesData } = await supabase
      .from('grades')
      .select('period, total_score, class_id');

    // 3. Fetch Attendance
    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select('date, status, class_id');

    // Compute Students Stats
    const totalStudents = studentsData?.length || 0;
    const girlsCount = studentsData?.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length || 0;
    const boysCount = totalStudents - girlsCount;

    // Compute At Risk
    const atRiskStudentsRaw = studentsData?.filter(s => s.risk_level === 'high' || s.risk_level === 'medium') || [];
    const atRiskCount = atRiskStudentsRaw.length;
    
    const atRiskList = atRiskStudentsRaw.map(s => {
      let reasons: string[] = [];
      if (Array.isArray(s.behavior_history)) {
        reasons = s.behavior_history;
      }
      if (reasons.length === 0) {
        reasons = [s.risk_level === 'high' ? 'អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះខ្លាំង' : 'ត្រូវការការតាមដានបន្ថែម'];
      }
      return {
        id: s.id,
        name: s.full_name,
        reasons: reasons,
        severity: s.risk_level as 'high' | 'medium'
      };
    });

    // We will map these to standard months:
    const monthMapping: Record<string, string> = {
      'dec': 'ធ្នូ', 'jan': 'មករា', 'feb': 'កុម្ភៈ', 'mar': 'មីនា',
      'apr': 'មេសា', 'may': 'ឧសភា', 'jun': 'មិថុនា', 'jul': 'កក្កដា',
    };

    // Calculate Grade Pct per period and overall GPA
    const gradeByPeriod: Record<string, { sum: number; count: number }> = {};
    let totalGradeSum = 0;
    let totalGradeCount = 0;

    if (gradesData) {
      gradesData.forEach(g => {
        if (!gradeByPeriod[g.period]) gradeByPeriod[g.period] = { sum: 0, count: 0 };
        const s = (g.total_score || 0); 
        gradeByPeriod[g.period].sum += s; 
        gradeByPeriod[g.period].count++;
        totalGradeSum += s;
        totalGradeCount++;
      });
    }
    
    const avgScore = totalGradeCount > 0 ? (totalGradeSum / totalGradeCount) : 0;
    const overallGpa = ((avgScore / 100) * 4.0).toFixed(2);

    // Calculate Attendance Pct per month and overall
    const attByMonth: Record<string, { present: number; total: number }> = {};
    let totalPresent = 0;
    let totalAtt = 0;

    if (attendanceData) {
      attendanceData.forEach(a => {
        const d = new Date(a.date);
        const m = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
        if (!attByMonth[m]) attByMonth[m] = { present: 0, total: 0 };
        
        if (a.status === 'present' || a.status === 'late') {
          attByMonth[m].present++;
          totalPresent++;
        }
        attByMonth[m].total++;
        totalAtt++;
      });
    }
    const overallAttendance = totalAtt > 0 ? ((totalPresent / totalAtt) * 100).toFixed(1) : '0.0';

    const periodsOrder = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'];
    const trendData = periodsOrder.map(p => {
      const g = gradeByPeriod[p];
      const gradePct = g && g.count > 0 ? Math.round(g.sum / g.count) : 0;
      
      const a = attByMonth[p];
      const attendancePct = a && a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
      
      return {
        monthLabel: monthMapping[p] || p,
        attendancePct: attendancePct || 0, 
        gradePct: gradePct || 0
      };
    });
    
    const tableData = [
      { grade: 'ថ្នាក់ទី 12', classes: 5, students: 245, att: 98.2, gpa: '3.65', ab: 72.4, eval: 'ល្អប្រសើរ' },
      { grade: 'ថ្នាក់ទី 11', classes: 6, students: 260, att: 96.5, gpa: '3.40', ab: 64.0, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 10', classes: 6, students: 285, att: 95.8, gpa: '3.35', ab: 58.5, eval: 'ល្អ' },
      { grade: 'ថ្នាក់ទី 9', classes: 6, students: 290, att: 96.0, gpa: '3.28', ab: 55.0, eval: 'មធ្យមល្អ' },
      { grade: 'ថ្នាក់ទី 8', classes: 5, students: 130, att: 94.5, gpa: '3.10', ab: 48.0, eval: 'មធ្យម' },
      { grade: 'ថ្នាក់ទី 7', classes: 5, students: 135, att: 97.0, gpa: '3.50', ab: 68.0, eval: 'ល្អ' },
    ];

    return { 
      trendData,
      totalStudents,
      girlsCount,
      boysCount,
      overallAttendance,
      overallGpa,
      atRiskCount,
      atRiskList,
      tableData
    };
  } catch (err) {
    console.error('Error fetching principal data:', err);
    return null;
  }
}
