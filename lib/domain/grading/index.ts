import { getCurriculumSchemaForClass, CurriculumSchema } from '@/lib/curriculum';

export interface SubjectScoreBreakdown {
  subjectId: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  isPassing: boolean;
}

export interface ExamGradingScale {
  id?: string;
  grade_letter: string;
  min_percentage: number;
  max_percentage: number;
  gpa_point?: number;
  description_khmer?: string;
}

export interface StudentGradeCalculationResult {
  totalScore: number;
  maxTotal: number;
  totalCoefficient: number; // The divisor / "មេគុណបែងចែក" (sum of coefficients or maxTotal / 50)
  averageScore50: number;   // Average on Scale 50 (totalScore / totalCoefficient)
  averageScore: number;     // Average on Scale 10 ((totalScore / maxTotal) * 10)
  percentage: number;       // Percentage ((totalScore / maxTotal) * 100)
  gradeLetter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | string;
  gradeMentionKh: string;   // Dynamic Khmer mention from exam_grading_scales
  isPassing: boolean;
  subjectBreakdowns: SubjectScoreBreakdown[];
  subjectCount: number;
}

/**
 * Maps percentage or 10-scale average to official MoEYS Letter Grade and Khmer Mention.
 * Supports dynamic grading scales configured by Admin in exam_grading_scales.
 */
export function calculateGradeLetter(
  scoreOrPercentage: number,
  dynamicScales?: ExamGradingScale[]
): { letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | string; mentionKh: string } {
  // Normalize input: if <= 10.0, convert 10-scale score to percentage (e.g., 8.5 -> 85.0%)
  const percentage = scoreOrPercentage <= 10.0 ? scoreOrPercentage * 10.0 : scoreOrPercentage;

  // 1. If dynamic scales from exam_grading_scales are provided, match range
  if (dynamicScales && dynamicScales.length > 0) {
    const sortedScales = [...dynamicScales].sort((a, b) => Number(b.min_percentage ?? 0) - Number(a.min_percentage ?? 0));
    for (const scale of sortedScales) {
      const min = Number(scale.min_percentage ?? 0);
      const max = Number(scale.max_percentage ?? 100);
      if (percentage >= min && percentage <= max) {
        return {
          letter: scale.grade_letter,
          mentionKh: scale.description_khmer || scale.grade_letter
        };
      }
    }
  }

  // 2. Default national MoEYS standard percentage thresholds
  if (percentage >= 90.0) return { letter: 'A', mentionKh: 'ល្អប្រសើរ (Excellent)' };
  if (percentage >= 80.0) return { letter: 'B', mentionKh: 'ល្អណាស់ (Very Good)' };
  if (percentage >= 70.0) return { letter: 'C', mentionKh: 'ល្អ (Good)' };
  if (percentage >= 60.0) return { letter: 'D', mentionKh: 'ល្អបង្គួរ (Fairly Good)' };
  if (percentage >= 50.0) return { letter: 'E', mentionKh: 'មធ្យម (Pass)' };
  return { letter: 'F', mentionKh: 'ធ្លាក់ (Fail)' };
}

/**
 * Calculates a single student's monthly grade from raw subject scores
 * using curriculum schema (coefficients and max scores) and optional dynamic grading scales.
 */
export function calculateStudentMonthlyGrade(
  scores: Record<string, number>,
  schema: CurriculumSchema,
  dynamicScales?: ExamGradingScale[]
): StudentGradeCalculationResult {
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

  // Compute total coefficient divisor (ផលបូកមេគុណ): sum of coefficients or maxTotal / 50
  const coeffSum = schema.subjects.reduce((sum, s) => {
    const c = s.coefficient !== undefined && s.coefficient !== null ? s.coefficient : (s.maxScore / 50);
    return sum + c;
  }, 0);
  const totalCoefficient = coeffSum > 0 ? parseFloat(coeffSum.toFixed(2)) : (maxTotal > 0 ? parseFloat((maxTotal / 50).toFixed(2)) : 1);

  // Scale 50 Average: totalScore / totalCoefficient (e.g. 420 / 14 = 30.00 / 50)
  const averageScore50 = totalCoefficient > 0 ? parseFloat((totalScore / totalCoefficient).toFixed(2)) : 0;

  // Scale 10 Average: (totalScore / maxTotal) * 10 (e.g. (420 / 700) * 10 = 6.00 / 10)
  const averageScore = maxTotal > 0 ? parseFloat(((totalScore / maxTotal) * 10).toFixed(2)) : 0;

  // Percentage (0-100%)
  const percentage = maxTotal > 0 ? parseFloat(((totalScore / maxTotal) * 100).toFixed(2)) : 0;

  // Match dynamic grading letter & mention from admin exam_grading_scales
  const { letter, mentionKh } = calculateGradeLetter(percentage, dynamicScales);

  return {
    totalScore: parseFloat(totalScore.toFixed(2)),
    maxTotal,
    totalCoefficient,
    averageScore50,
    averageScore,
    percentage,
    gradeLetter: letter,
    gradeMentionKh: mentionKh,
    isPassing: averageScore50 >= 25.0,
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
  schema: CurriculumSchema,
  dynamicScales?: ExamGradingScale[]
): { calculatedScores: Record<string, number>; summary: StudentGradeCalculationResult } {
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

  const summary = calculateStudentMonthlyGrade(calculatedScores, schema, dynamicScales);
  return { calculatedScores, summary };
}

/**
 * Calculates official MoEYS Annual Grade:
 * Formula: (Semester 1 Summary + Semester 2 Summary) / 2
 */
export function calculateStudentAnnualGrade(
  sem1Scores: Record<string, number>,
  sem2Scores: Record<string, number>,
  schema: CurriculumSchema,
  dynamicScales?: ExamGradingScale[]
): { calculatedScores: Record<string, number>; summary: StudentGradeCalculationResult } {
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

  const summary = calculateStudentMonthlyGrade(calculatedScores, schema, dynamicScales);
  return { calculatedScores, summary };
}

/**
 * Maps Scale 50 Average (0.00 - 50.00) to official MoEYS Letter Grade and Khmer Mention.
 * (e.g. 45.0/50 -> 90.0% -> 'A', 43.0/50 -> 86.0% -> 'B', 25.0/50 -> 50.0% -> 'E')
 */
export function calculateScale50Grade(
  average50: number,
  dynamicScales?: ExamGradingScale[]
): { letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | string; mentionKh: string } {
  const percentage = (Number(average50 || 0) / 50.0) * 100.0;
  return calculateGradeLetter(percentage, dynamicScales);
}

/**
 * Computes a single student's rank using standard MoEYS competition ranking (1, 1, 3).
 * Rank = 1 + number of students with strictly higher score.
 */
export function computeStudentRank(
  targetScore: number,
  allScores: (number | null | undefined)[]
): number {
  const validTarget = Number(targetScore) || 0;
  let strictlyHigherCount = 0;
  for (const s of allScores) {
    if (s !== undefined && s !== null && Number(s) > validTarget) {
      strictlyHigherCount++;
    }
  }
  return 1 + strictlyHigherCount;
}

/**
 * Assigns ranks to a list of students with standard MoEYS tie handling (1, 1, 3).
 * Supports custom score accessor or defaults to item.totalScore / item.total_score / item.average_score.
 */
export function assignGradeRanks<T>(
  records: T[],
  scoreAccessor?: ((item: T) => number) | keyof T
): (T & { rank: number })[] {
  const getScore = (item: any): number => {
    if (typeof scoreAccessor === 'function') {
      return Number(scoreAccessor(item)) || 0;
    }
    if (typeof scoreAccessor === 'string') {
      return Number(item[scoreAccessor]) || 0;
    }
    if (item.totalScore !== undefined) return Number(item.totalScore) || 0;
    if (item.total_score !== undefined) return Number(item.total_score) || 0;
    if (item.average_score !== undefined) return Number(item.average_score) || 0;
    if (item.averageScore50 !== undefined) return Number(item.averageScore50) || 0;
    return 0;
  };

  const sorted = [...records].sort((a, b) => getScore(b) - getScore(a));
  let currentRank = 1;

  return sorted.map((item, index) => {
    if (index > 0 && getScore(item) < getScore(sorted[index - 1])) {
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
  subjectIds: string[],
  schema: CurriculumSchema
): Record<string, number> {
  const scores: Record<string, number> = {};

  if (period === 'sem1-summary') {
    const dec = gradesData.find(g => g.student_id === studentId && g.period === 'dec')?.scores || {};
    const jan = gradesData.find(g => g.student_id === studentId && g.period === 'jan')?.scores || {};
    const feb = gradesData.find(g => g.student_id === studentId && g.period === 'feb')?.scores || {};
    const exam = gradesData.find(g => g.student_id === studentId && g.period === 'sem1-exam')?.scores || {};

    const { calculatedScores } = calculateStudentSemesterGrade([dec, jan, feb], exam, schema);
    // Filter to requested subjectIds
    subjectIds.forEach(subId => {
      if (typeof calculatedScores[subId] === 'number') {
        scores[subId] = calculatedScores[subId];
      }
    });
  } else if (period === 'sem2-summary') {
    const may = gradesData.find(g => g.student_id === studentId && g.period === 'may')?.scores || {};
    const jun = gradesData.find(g => g.student_id === studentId && g.period === 'jun')?.scores || {};
    const jul = gradesData.find(g => g.student_id === studentId && g.period === 'jul')?.scores || {};
    const exam = gradesData.find(g => g.student_id === studentId && g.period === 'sem2-exam')?.scores || {};

    const { calculatedScores } = calculateStudentSemesterGrade([may, jun, jul], exam, schema);
    subjectIds.forEach(subId => {
      if (typeof calculatedScores[subId] === 'number') {
        scores[subId] = calculatedScores[subId];
      }
    });
  } else if (period === 'annual') {
    const sem1 = computeSummaryGrades(gradesData, studentId, 'sem1-summary', subjectIds, schema);
    const sem2 = computeSummaryGrades(gradesData, studentId, 'sem2-summary', subjectIds, schema);

    const { calculatedScores } = calculateStudentAnnualGrade(sem1, sem2, schema);
    subjectIds.forEach(subId => {
      if (typeof calculatedScores[subId] === 'number') {
        scores[subId] = calculatedScores[subId];
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
