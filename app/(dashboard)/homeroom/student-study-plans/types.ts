/**
 * Study Plan Types, Constants, Zod Validation Schemas, and Authoritative Curriculum Resolvers
 */

import { z } from 'zod';
import { getCurriculumSchemaForClass, CurriculumSchema, SubjectSchema } from '@/lib/curriculum';
import { getSubjectGradeLetter, STUDY_PLAN_SUBJECTS } from './StudentStudyPlanDocument';

export * from './StudentStudyPlanDocument';

export const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type GradeLetter = (typeof GRADE_LETTERS)[number];

export const VALID_MONTH_IDS = [
  'nov',
  'dec',
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
] as const;
export type ValidMonthId = (typeof VALID_MONTH_IDS)[number];

export const VALID_SUBJECT_IDS = [
  'khmer',
  'math',
  'foreign_lang',
  'physics',
  'chemistry',
  'biology',
  'earth_science',
  'morals',
  'history',
  'geography',
] as const;
export type ValidSubjectId = (typeof VALID_SUBJECT_IDS)[number];

export const ALLOWED_SUBJECT_KEYS = [
  ...VALID_SUBJECT_IDS,
  'english',
  'eng',
  'earth',
  'civics',
] as const;

export const GradeLetterSchema = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase())
  .refine((val) => val === '' || ['A', 'B', 'C', 'D', 'E', 'F'].includes(val), {
    message: 'Grade must be A, B, C, D, E, F or empty',
  });

export const MonthKeySchema = z
  .string()
  .trim()
  .refine((val) => VALID_MONTH_IDS.includes(val as any), {
    message: 'Month ID must be one of nov, dec, jan, feb, mar, apr, may, jun, jul, aug',
  });

export const SubjectKeySchema = z
  .string()
  .trim()
  .refine((val) => ALLOWED_SUBJECT_KEYS.includes(val as any), {
    message: 'Subject ID must be a recognized study plan subject or alias',
  });

export const SubjectPlanTargetSchema = z.object({
  initial: GradeLetterSchema.optional().default(''),
  plan: z.record(MonthKeySchema, GradeLetterSchema).optional().default({}),
  end_plan: GradeLetterSchema.optional().default(''),
  actual: z.record(MonthKeySchema, GradeLetterSchema).optional().default({}),
  end_actual: GradeLetterSchema.optional().default(''),
});

export const SaveStudyPlanPayloadSchema = z.object({
  student_id: z.string().uuid({ message: 'Invalid student UUID' }),
  class_id: z.string().uuid({ message: 'Invalid class UUID' }),
  academic_year_id: z.string().uuid({ message: 'Invalid academic year UUID' }),
  subject_targets: z.record(SubjectKeySchema, SubjectPlanTargetSchema),
});

export const BatchSaveStudyPlanPayloadSchema = z
  .object({
    class_id: z.string().uuid({ message: 'Invalid class UUID' }),
    academic_year_id: z.string().uuid({ message: 'Invalid academic year UUID' }),
    plans: z
      .array(
        z.object({
          student_id: z.string().uuid({ message: 'Invalid student UUID' }),
          subject_targets: z.record(SubjectKeySchema, SubjectPlanTargetSchema),
        })
      )
      .min(1, { message: 'Plans payload cannot be empty' })
      .max(120, { message: 'Batch size exceeds class capacity limit (120)' }),
  })
  .refine(
    (data) => {
      const ids = new Set(data.plans.map((p) => p.student_id));
      return ids.size === data.plans.length;
    },
    { message: 'Duplicate student IDs in batch save payload' }
  );

export type ValidatedBatchStudyPlanPayload = z.infer<typeof BatchSaveStudyPlanPayloadSchema>;

/**
 * Authoritative resolver for subject maximum scores according to official MoEYS curriculum,
 * class grade, and stream/track.
 */
export function resolveSubjectMaxScore(
  grade: string | number | undefined | null,
  track: string | undefined | null,
  subjectId: string,
  aliases?: string[],
  officialLabel?: string,
  curriculumSchema?: CurriculumSchema
): number {
  const schema: CurriculumSchema = curriculumSchema || getCurriculumSchemaForClass(grade, track);
  const gradeLevelNum = parseInt(String(grade || '12').replace(/[^0-9]/g, ''), 10) || 12;

  // 1. Check direct ID or alias in curriculum schema
  const schemaSub = schema.subjects.find((s: SubjectSchema) => {
    if (s.id === subjectId) return true;
    if (aliases && aliases.includes(s.id)) return true;
    if (officialLabel && (s.label === officialLabel || s.label.includes(officialLabel))) return true;
    return false;
  });

  if (schemaSub && Number.isFinite(schemaSub.maxScore)) {
    return schemaSub.maxScore;
  }

  // 2. Strict defaults according to MoEYS standards
  if (gradeLevelNum <= 9) {
    if (subjectId === 'khmer' || subjectId === 'math' || subjectId === 'foreign_lang') return 100;
    return 50;
  }

  if (gradeLevelNum === 10) {
    if (subjectId === 'khmer' || subjectId === 'math') return 150;
    if (subjectId === 'foreign_lang') return 100;
    return 50;
  }

  // Grade 11-12
  if (subjectId === 'khmer') return 150;
  if (subjectId === 'foreign_lang') return 100;
  return 50;
}

/**
 * Authoritative single grade-letter resolution combining curriculum max score and MoEYS grading scale.
 */
export function resolveAuthoritativeGradeLetter(
  score: number | undefined | null,
  grade: string | number | undefined | null,
  track: string | undefined | null,
  subjectId: string,
  aliases?: string[],
  officialLabel?: string,
  curriculumSchema?: CurriculumSchema
): string {
  if (score === undefined || score === null || isNaN(Number(score)) || (score as any) === '') {
    return '';
  }
  const maxScore = resolveSubjectMaxScore(grade, track, subjectId, aliases, officialLabel, curriculumSchema);
  if (maxScore <= 0) return '';
  const gradeLevelNum = parseInt(String(grade || '12').replace(/[^0-9]/g, ''), 10) || 12;
  return getSubjectGradeLetter(Number(score), maxScore, gradeLevelNum);
}

/**
 * Score lookup from period scores supporting canonical ID and known aliases.
 */
export function lookupScoreWithAliases(
  scores: Record<string, number> | undefined | null,
  subjectId: string,
  aliases?: string[]
): number | undefined {
  if (!scores) return undefined;
  if (scores[subjectId] !== undefined) return scores[subjectId];
  if (aliases) {
    for (const a of aliases) {
      if (scores[a] !== undefined) return scores[a];
    }
  }
  return undefined;
}
