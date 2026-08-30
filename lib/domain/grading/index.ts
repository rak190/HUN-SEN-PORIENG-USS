import { getCurriculumSchemaForClass, CurriculumSchema } from '@/lib/curriculum';

export interface SubjectScoreBreakdown {
  subjectId: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  isPassing: boolean;
}

export interface StudentGradeCalculationResult {
  totalScore: number;
  maxTotal: number;
  averageScore: number; // Scaled to 10.00
  gradeLetter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  gradeMentionKh: string;
  isPassing: boolean;
  subjectBreakdowns: SubjectScoreBreakdown[];
  subjectCount: number;
}

/**
 * Maps average score (out of 10) to official MoEYS Letter Grade and Khmer Mention
 */
export function calculateGradeLetter(averageScore: number): { letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; mentionKh: string } {
  if (averageScore >= 9.0) return { letter: 'A', mentionKh: 'ល្អប្រសើរ (Excellent)' };
  if (averageScore >= 8.0) return { letter: 'B', mentionKh: 'ល្អណាស់ (Very Good)' };
  if (averageScore >= 7.0) return { letter: 'C', mentionKh: 'ល្អ (Good)' };
  if (averageScore >= 6.0) return { letter: 'D', mentionKh: 'ល្អបង្គួរ (Fairly Good)' };
  if (averageScore >= 5.0) return { letter: 'E', mentionKh: 'មធ្យម (Pass)' };
  return { letter: 'F', mentionKh: 'ធ្លាក់ (Fail)' };
}

/**
 * Calculates a single student's monthly grade from raw subject scores
 */
export function calculateStudentMonthlyGrade(
  scores: Record<string, number>,
  grade?: string | number | null,
  track?: string | null
): StudentGradeCalculationResult {
  const schema = getCurriculumSchemaForClass(grade, track);
  let totalScore = 0;
  let subjectCount = 0;
  const breakdowns: SubjectScoreBreakdown[] = [];

  schema.subjects.forEach(sub => {
    let scoreVal = scores[sub.id];

    // Handle composite Khmer sub-metrics (dictation + composition)
    if (scoreVal === undefined && sub.id === 'khmer') {
      const dict = scores['khmer_dictation'] || 0;
      const comp = scores['khmer_composition'] || 0;
      if (dict > 0 || comp > 0) {
        scoreVal = dict + comp;
      }
    }

    if (scoreVal !== undefined && typeof scoreVal === 'number' && !isNaN(scoreVal)) {
      totalScore += scoreVal;
      subjectCount++;
      breakdowns.push({
        subjectId: sub.id,
        label: sub.label,
        score: parseFloat(scoreVal.toFixed(2)),
        maxScore: sub.maxScore,
        percentage: sub.maxScore > 0 ? parseFloat(((scoreVal / sub.maxScore) * 100).toFixed(1)) : 0,
        isPassing: scoreVal >= (sub.maxScore * 0.5)
      });
    }
  });

  const maxTotal = schema.subjects.reduce((sum, s) => sum + s.maxScore, 0);
  const averageScore = maxTotal > 0 ? parseFloat(((totalScore / maxTotal) * 10).toFixed(2)) : 0;
  const { letter, mentionKh } = calculateGradeLetter(averageScore);

  return {
    totalScore: parseFloat(totalScore.toFixed(2)),
    maxTotal,
    averageScore,
    gradeLetter: letter,
    gradeMentionKh: mentionKh,
    isPassing: averageScore >= 5.0,
    subjectBreakdowns: breakdowns,
    subjectCount
  };
}

/**
 * Calculates official MoEYS Semester Grade:
 * Formula: ((Monthly Average) + Exam Score) / 2
 */
export function calculateStudentSemesterGrade(
  monthlyScoresList: Record<string, number>[], // Scores for month 1, 2, 3
  examScores: Record<string, number>,
  grade?: string | number | null,
  track?: string | null
): { calculatedScores: Record<string, number>; summary: StudentGradeCalculationResult } {
  const schema = getCurriculumSchemaForClass(grade, track);
  const calculatedScores: Record<string, number> = {};

  const allSubjectIds = new Set<string>();
  schema.subjects.forEach(s => {
    allSubjectIds.add(s.id);
    if (s.subMetrics) {
      s.subMetrics.forEach(m => allSubjectIds.add(`${s.id}_${m.id}`));
    }
  });

  allSubjectIds.forEach(subjId => {
    let monthlySum = 0;
    let monthsRecorded = 0;

    monthlyScoresList.forEach(mScores => {
      const val = mScores[subjId];
      if (typeof val === 'number' && !isNaN(val)) {
        monthlySum += val;
        monthsRecorded++;
      }
    });

    const monthlyAvg = monthlyScoresList.length > 0 ? (monthlySum / monthlyScoresList.length) : 0;
    const examVal = examScores[subjId];
    const hasExam = typeof examVal === 'number' && !isNaN(examVal);

    if (monthsRecorded > 0 || hasExam) {
      if (hasExam) {
        calculatedScores[subjId] = parseFloat((((monthlyAvg) + examVal) / 2).toFixed(2));
      } else {
        calculatedScores[subjId] = parseFloat(monthlyAvg.toFixed(2));
      }
    }
  });

  const summary = calculateStudentMonthlyGrade(calculatedScores, grade, track);
  return { calculatedScores, summary };
}

/**
 * Calculates official MoEYS Annual Grade:
 * Formula: (Semester 1 Summary + Semester 2 Summary) / 2
 */
export function calculateStudentAnnualGrade(
  sem1Scores: Record<string, number>,
  sem2Scores: Record<string, number>,
  grade?: string | number | null,
  track?: string | null
): { calculatedScores: Record<string, number>; summary: StudentGradeCalculationResult } {
  const schema = getCurriculumSchemaForClass(grade, track);
  const calculatedScores: Record<string, number> = {};

  const allSubjectIds = new Set<string>();
  schema.subjects.forEach(s => {
    allSubjectIds.add(s.id);
    if (s.subMetrics) {
      s.subMetrics.forEach(m => allSubjectIds.add(`${s.id}_${m.id}`));
    }
  });

  allSubjectIds.forEach(subjId => {
    const s1 = sem1Scores[subjId];
    const s2 = sem2Scores[subjId];
    const hasS1 = typeof s1 === 'number' && !isNaN(s1);
    const hasS2 = typeof s2 === 'number' && !isNaN(s2);

    if (hasS1 && hasS2) {
      calculatedScores[subjId] = parseFloat(((s1 + s2) / 2).toFixed(2));
    } else if (hasS1) {
      calculatedScores[subjId] = parseFloat(s1.toFixed(2));
    } else if (hasS2) {
      calculatedScores[subjId] = parseFloat(s2.toFixed(2));
    }
  });

  const summary = calculateStudentMonthlyGrade(calculatedScores, grade, track);
  return { calculatedScores, summary };
}

/**
 * Assigns ranks to a list of students with standard MoEYS tie handling (1, 1, 3)
 */
export function assignGradeRanks<T extends { average_score: number }>(records: T[]): (T & { rank: number })[] {
  const sorted = [...records].sort((a, b) => b.average_score - a.average_score);
  let currentRank = 1;

  return sorted.map((item, index) => {
    if (index > 0 && item.average_score < sorted[index - 1].average_score) {
      currentRank = index + 1;
    }
    return {
      ...item,
      rank: currentRank
    };
  });
}
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
