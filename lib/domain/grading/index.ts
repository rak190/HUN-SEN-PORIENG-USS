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
