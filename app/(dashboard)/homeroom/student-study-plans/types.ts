/**
 * Study Plan Types, Constants, and Zod Validation Schemas
 */

import { z } from 'zod';
export * from './StudentStudyPlanDocument';

export const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type GradeLetter = (typeof GRADE_LETTERS)[number];

export const GradeLetterSchema = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase())
  .refine((val) => val === '' || ['A', 'B', 'C', 'D', 'E', 'F'].includes(val), {
    message: 'Grade must be A, B, C, D, E, F or empty',
  });

export const SubjectPlanTargetSchema = z.object({
  initial: GradeLetterSchema.optional().default(''),
  plan: z.record(z.string(), GradeLetterSchema).optional().default({}),
  end_plan: GradeLetterSchema.optional().default(''),
  actual: z.record(z.string(), GradeLetterSchema).optional().default({}),
  end_actual: GradeLetterSchema.optional().default(''),
});

export const SaveStudyPlanPayloadSchema = z.object({
  student_id: z.string().uuid({ message: 'Invalid student UUID' }),
  class_id: z.string().uuid({ message: 'Invalid class UUID' }),
  academic_year_id: z.string().uuid({ message: 'Invalid academic year UUID' }),
  subject_targets: z.record(z.string(), SubjectPlanTargetSchema),
});

export const BatchSaveStudyPlanPayloadSchema = z.object({
  class_id: z.string().uuid({ message: 'Invalid class UUID' }),
  academic_year_id: z.string().uuid({ message: 'Invalid academic year UUID' }),
  plans: z.array(
    z.object({
      student_id: z.string().uuid({ message: 'Invalid student UUID' }),
      subject_targets: z.record(z.string(), SubjectPlanTargetSchema),
    })
  ).min(1, { message: 'Plans payload cannot be empty' }),
});

export type ValidatedBatchStudyPlanPayload = z.infer<typeof BatchSaveStudyPlanPayloadSchema>;
