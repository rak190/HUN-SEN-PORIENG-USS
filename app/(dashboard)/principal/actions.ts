'use server';

import { createClient } from '@/lib/supabase/server';

export async function fetchPrincipalDashboardData() {
  try {
    const supabase = await createClient();
    
    // 1. Fetch Active Academic Year
    const { data: activeYear } = await supabase
      .from('academic_years')
      .select('id, start_date, end_date')
      .eq('is_active', true)
      .maybeSingle();

    const academicStartDate = activeYear?.start_date || `${new Date().getFullYear() - 1}-10-01`;

    // 1.5 Fetch Classes for active year
    let classesQuery = supabase
      .from('classes')
      .select('id, name, grade, track')
      .eq('is_archived', false);

    if (activeYear?.id) {
      classesQuery = classesQuery.eq('academic_year_id', activeYear.id);
    }

    const { data: classesData, error: classesError } = await classesQuery;
    if (classesError) throw classesError;

    const activeClassIds = (classesData || []).map(c => c.id);

    // 1.6 Fetch Students in active classes
    let studentsQuery = supabase
      .from('students')
      .select('id, gender, dropout_risk, is_slow_learner, full_name, class_id, is_active')
      .eq('is_active', true);

    if (activeClassIds.length > 0) {
      studentsQuery = studentsQuery.in('class_id', activeClassIds);
    }

    const { data: studentsData, error: studentsError } = await studentsQuery;
    if (studentsError) throw studentsError;

    // 2. Fetch Grades for active classes
    let gradesQuery = supabase
      .from('grades')
      .select('period, total_score, class_id, scores');

    if (activeClassIds.length > 0) {
      gradesQuery = gradesQuery.in('class_id', activeClassIds);
    }

    const { data: gradesData } = await gradesQuery;

    // 3. Fetch Attendance for active classes within current school year range
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('date, status, class_id')
      .gte('date', academicStartDate);

    if (activeClassIds.length > 0) {
      attendanceQuery = attendanceQuery.in('class_id', activeClassIds);
    }

    const { data: attendanceData } = await attendanceQuery;

    // Compute Students Stats
    const totalStudents = studentsData?.length || 0;
    const girlsCount = studentsData?.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length || 0;
    const boysCount = totalStudents - girlsCount;

    // Compute At Risk
    const atRiskStudentsRaw = studentsData?.filter(s => s.dropout_risk || s.is_slow_learner) || [];
    const atRiskCount = atRiskStudentsRaw.length;
    
    const atRiskList = atRiskStudentsRaw.map(s => {
      let reasons: string[] = [];
      if (s.dropout_risk) {
        reasons.push('ហានិភ័យបោះបង់ការសិក្សា (អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះ)');
      }
      if (s.is_slow_learner) {
        reasons.push('សិស្សរៀនយឺត (ត្រូវការការជួយបំប៉ន)');
      }
      if (reasons.length === 0) {
        reasons = ['ស្ថិតក្នុងការតាមដានពិសេស'];
      }
      return {
        id: s.id,
        name: s.full_name,
        reasons: reasons,
        severity: (s.dropout_risk ? 'high' : 'medium') as 'high' | 'medium'
      };
    });

    const monthMapping: Record<string, string> = {
      'dec': 'ធ្នូ', 'jan': 'មករា', 'feb': 'កុម្ភៈ', 'mar': 'មីនា',
      'apr': 'មេសា', 'may': 'ឧសភា', 'jun': 'មិថុនា', 'jul': 'កក្កដា',
    };

    // Calculate Grade Pct per period and overall GPA
    const gradeByPeriod: Record<string, { sum: number; count: number }> = {};
    let totalGradePctSum = 0;
    let totalGradePctCount = 0;

    if (gradesData) {
      gradesData.forEach(g => {
        if (!gradeByPeriod[g.period]) gradeByPeriod[g.period] = { sum: 0, count: 0 };
        
        let scoreVal = g.total_score;
        if (!scoreVal && g.scores && typeof g.scores === 'object') {
          const vals = Object.values(g.scores).filter(v => typeof v === 'number') as number[];
          if (vals.length > 0) scoreVal = vals.reduce((a, b) => a + b, 0);
        }

        if (typeof scoreVal === 'number' && scoreVal > 0) {
          // Normalize score to percentage (assuming ~500 for upper, 400 for lower, max 100 per metric)
          const maxApprox = 500;
          const pct = Math.min(100, (scoreVal / maxApprox) * 100);
          gradeByPeriod[g.period].sum += pct;
          gradeByPeriod[g.period].count++;
          totalGradePctSum += pct;
          totalGradePctCount++;
        }
      });
    }
    
    const avgPct = totalGradePctCount > 0 ? (totalGradePctSum / totalGradePctCount) : 0;
    const overallGpa = avgPct > 0 ? Math.min(4.0, (avgPct / 100) * 4.0).toFixed(2) : '0.00';

    // Calculate Attendance Pct per month and overall
    const attByMonth: Record<string, { present: number; total: number }> = {};
    let totalPresent = 0;
    let totalAtt = 0;

    if (attendanceData) {
      attendanceData.forEach(a => {
        const d = new Date(a.date);
        const m = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][d.getMonth()];
        if (!attByMonth[m]) attByMonth[m] = { present: 0, total: 0 };
        
        if (a.status === 'present' || a.status === 'late' || a.status === 'permission' || a.status === 'P') {
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
    
    const gradesSet = ['12', '11', '10', '9', '8', '7'];
    const tableData = gradesSet.map(gr => {
       const classesInGrade = classesData?.filter(c => String(c.grade) === String(gr)) || [];
       const classIds = classesInGrade.map(c => c.id);
       
       const studentsInGrade = studentsData?.filter(s => classIds.includes(s.class_id)) || [];
       const numStudents = studentsInGrade.length;
       
       // Calculate Attendance for this grade
       const attInGrade = attendanceData?.filter(a => classIds.includes(a.class_id)) || [];
       let attPresent = 0;
       attInGrade.forEach(a => { 
         if (a.status === 'present' || a.status === 'late' || a.status === 'permission' || a.status === 'P') attPresent++; 
       });
       const attPct = attInGrade.length > 0 ? (attPresent / attInGrade.length) * 100 : 0;
       
       // Calculate GPA for this grade
       const gradesInGrade = gradesData?.filter(g => classIds.includes(g.class_id)) || [];
       const maxApprox = parseInt(gr) >= 10 ? 500 : 400;
       let totalScoreSum = 0;
       let validScoreCount = 0;

       gradesInGrade.forEach(g => {
         let val = g.total_score;
         if (!val && g.scores && typeof g.scores === 'object') {
           const scoresList = Object.values(g.scores).filter(v => typeof v === 'number') as number[];
           if (scoresList.length > 0) val = scoresList.reduce((a, b) => a + b, 0);
         }
         if (typeof val === 'number' && val > 0) {
           totalScoreSum += val;
           validScoreCount++;
         }
       });

       const avgScore = validScoreCount > 0 ? (totalScoreSum / validScoreCount) : 0;
       const percentage = avgScore > 0 ? Math.min(100, (avgScore / maxApprox) * 100) : 0;
       const gpa = percentage > 0 ? Math.min(4.0, (percentage / 100) * 4.0).toFixed(2) : '0.00';
       
       const evalLabel = parseFloat(gpa) >= 3.5 ? 'ល្អប្រសើរ' : parseFloat(gpa) >= 3.0 ? 'ល្អ' : parseFloat(gpa) >= 2.5 ? 'មធ្យមល្អ' : 'មធ្យម';
       
       return {
         grade: `ថ្នាក់ទី ${gr}`,
         classes: classesInGrade.length,
         students: numStudents,
         att: attPct,
         gpa: parseFloat(gpa) > 0 ? gpa : '0.00',
         ab: attPct > 0 ? (100 - attPct).toFixed(1) : '0.0', 
         eval: parseFloat(gpa) > 0 ? evalLabel : 'មិនមានទិន្នន័យ'
       };
    });

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
