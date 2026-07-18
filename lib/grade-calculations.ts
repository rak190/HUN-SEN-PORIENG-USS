export function computeSummaryGrades(
  gradesData: any[],
  studentId: string,
  period: string,
  subjectIds: string[]
): Record<string, number> {
  const scores: Record<string, number> = {};

  if (period === 'sem1-summary') {
    const dec = gradesData.find(g => g.student_id === studentId && g.period === 'dec')?.scores || {};
    const jan = gradesData.find(g => g.student_id === studentId && g.period === 'jan')?.scores || {};
    const feb = gradesData.find(g => g.student_id === studentId && g.period === 'feb')?.scores || {};
    const exam = gradesData.find(g => g.student_id === studentId && g.period === 'sem1-exam')?.scores || {};

    subjectIds.forEach(subId => {
      const d = dec[subId] || 0;
      const j = jan[subId] || 0;
      const f = feb[subId] || 0;
      const ex = exam[subId] || 0;
      
      const monthlyAvg = (d + j + f) / 3;
      const semAvg = (monthlyAvg + ex) / 2;
      
      if (d > 0 || j > 0 || f > 0 || ex > 0) {
        scores[subId] = Number(semAvg.toFixed(2));
      }
    });
  } else if (period === 'sem2-summary') {
    const may = gradesData.find(g => g.student_id === studentId && g.period === 'may')?.scores || {};
    const jun = gradesData.find(g => g.student_id === studentId && g.period === 'jun')?.scores || {};
    const jul = gradesData.find(g => g.student_id === studentId && g.period === 'jul')?.scores || {};
    const exam = gradesData.find(g => g.student_id === studentId && g.period === 'sem2-exam')?.scores || {};

    subjectIds.forEach(subId => {
      const m = may[subId] || 0;
      const ju = jun[subId] || 0;
      const jl = jul[subId] || 0;
      const ex = exam[subId] || 0;
      
      const monthlyAvg = (m + ju + jl) / 3;
      const semAvg = (monthlyAvg + ex) / 2;
      
      if (m > 0 || ju > 0 || jl > 0 || ex > 0) {
        scores[subId] = Number(semAvg.toFixed(2));
      }
    });
  } else if (period === 'annual') {
    // Annual is (Sem1 Summary + Sem2 Summary) / 2
    const sem1 = computeSummaryGrades(gradesData, studentId, 'sem1-summary', subjectIds);
    const sem2 = computeSummaryGrades(gradesData, studentId, 'sem2-summary', subjectIds);
    
    subjectIds.forEach(subId => {
      const s1 = sem1[subId] || 0;
      const s2 = sem2[subId] || 0;
      if (s1 > 0 || s2 > 0) {
        scores[subId] = Number(((s1 + s2) / 2).toFixed(2));
      }
    });
  } else {
    // Standard period
    const rec = gradesData.find(g => g.student_id === studentId && g.period === period);
    if (rec && rec.scores) {
      subjectIds.forEach(subId => {
        if (rec.scores[subId] !== undefined) {
          scores[subId] = rec.scores[subId];
        }
      });
    }
  }

  return scores;
}
