/**
 * Computes MoEYS standard summary scores across academic periods.
 * Handles partial semesters (1, 2, or 3 recorded months), preserved score 0, and semester examinations.
 */
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
      const monthVals: number[] = [];
      if (typeof dec[subId] === 'number' && !isNaN(dec[subId])) monthVals.push(dec[subId]);
      if (typeof jan[subId] === 'number' && !isNaN(jan[subId])) monthVals.push(jan[subId]);
      if (typeof feb[subId] === 'number' && !isNaN(feb[subId])) monthVals.push(feb[subId]);

      const hasExam = typeof exam[subId] === 'number' && !isNaN(exam[subId]);

      if (monthVals.length > 0 && hasExam) {
        const monthlyAvg = monthVals.reduce((sum, v) => sum + v, 0) / monthVals.length;
        const semAvg = (monthlyAvg + exam[subId]) / 2;
        scores[subId] = Number(semAvg.toFixed(2));
      } else if (monthVals.length > 0) {
        const monthlyAvg = monthVals.reduce((sum, v) => sum + v, 0) / monthVals.length;
        scores[subId] = Number(monthlyAvg.toFixed(2));
      } else if (hasExam) {
        scores[subId] = Number(exam[subId].toFixed(2));
      }
    });
  } else if (period === 'sem2-summary') {
    const may = gradesData.find(g => g.student_id === studentId && g.period === 'may')?.scores || {};
    const jun = gradesData.find(g => g.student_id === studentId && g.period === 'jun')?.scores || {};
    const jul = gradesData.find(g => g.student_id === studentId && g.period === 'jul')?.scores || {};
    const exam = gradesData.find(g => g.student_id === studentId && g.period === 'sem2-exam')?.scores || {};

    subjectIds.forEach(subId => {
      const monthVals: number[] = [];
      if (typeof may[subId] === 'number' && !isNaN(may[subId])) monthVals.push(may[subId]);
      if (typeof jun[subId] === 'number' && !isNaN(jun[subId])) monthVals.push(jun[subId]);
      if (typeof jul[subId] === 'number' && !isNaN(jul[subId])) monthVals.push(jul[subId]);

      const hasExam = typeof exam[subId] === 'number' && !isNaN(exam[subId]);

      if (monthVals.length > 0 && hasExam) {
        const monthlyAvg = monthVals.reduce((sum, v) => sum + v, 0) / monthVals.length;
        const semAvg = (monthlyAvg + exam[subId]) / 2;
        scores[subId] = Number(semAvg.toFixed(2));
      } else if (monthVals.length > 0) {
        const monthlyAvg = monthVals.reduce((sum, v) => sum + v, 0) / monthVals.length;
        scores[subId] = Number(monthlyAvg.toFixed(2));
      } else if (hasExam) {
        scores[subId] = Number(exam[subId].toFixed(2));
      }
    });
  } else if (period === 'annual') {
    // Annual is average of available semester summaries
    const sem1 = computeSummaryGrades(gradesData, studentId, 'sem1-summary', subjectIds);
    const sem2 = computeSummaryGrades(gradesData, studentId, 'sem2-summary', subjectIds);

    subjectIds.forEach(subId => {
      const hasS1 = typeof sem1[subId] === 'number' && !isNaN(sem1[subId]);
      const hasS2 = typeof sem2[subId] === 'number' && !isNaN(sem2[subId]);

      if (hasS1 && hasS2) {
        scores[subId] = Number(((sem1[subId] + sem2[subId]) / 2).toFixed(2));
      } else if (hasS1) {
        scores[subId] = sem1[subId];
      } else if (hasS2) {
        scores[subId] = sem2[subId];
      }
    });
  } else {
    // Standard period
    const rec = gradesData.find(g => g.student_id === studentId && g.period === period);
    if (rec && rec.scores) {
      subjectIds.forEach(subId => {
        if (typeof rec.scores[subId] === 'number' && !isNaN(rec.scores[subId])) {
          scores[subId] = rec.scores[subId];
        }
      });
    }
  }

  return scores;
}
