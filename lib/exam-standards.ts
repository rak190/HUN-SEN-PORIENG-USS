import { z } from "zod";
export const CURRICULUM_GRADES = [7, 8, 9, 10, 11, 12] as const;
export const CURRICULUM_STREAMS = ["general", "science", "social"] as const;
export const STREAM_LABELS = {
  general: "ទូទៅ",
  science: "វិទ្យាសាស្ត្រ",
  social: "សង្គម",
};
const decimal = (max: number, places: number) =>
  z
    .number()
    .finite()
    .min(0)
    .max(max)
    .refine(
      (n) => Math.abs(n * 10 ** places - Math.round(n * 10 ** places)) < 1e-7,
      `អនុញ្ញាតទសភាគ ${places} ខ្ទង់`,
    );
export const subjectStandardSchema = z
  .object({
    id: z.uuid().optional(),
    subject_name: z
      .string()
      .trim()
      .min(1, "សូមបញ្ចូលឈ្មោះមុខវិជ្ជា")
      .max(200)
      .regex(/^[^\u0000-\u001f]+$/),
    grade_level: z.number().int().min(7).max(12),
    stream_type: z.enum(CURRICULUM_STREAMS),
    coefficient: decimal(99.9, 1),
    max_score: decimal(9999.9, 1),
    is_core: z.boolean(),
  })
  .strict()
  .refine(
    (row) => row.grade_level >= 10 || row.stream_type === "general",
    "ថ្នាក់ទី ៧–៩ ប្រើកម្មវិធីទូទៅ",
  );
export const gradingScaleSchema = z
  .object({
    id: z.uuid().optional(),
    grade_letter: z
      .string()
      .trim()
      .min(1)
      .max(5)
      .regex(/^[A-Za-z0-9+-]+$/),
    min_percentage: decimal(100, 2),
    max_percentage: decimal(100, 2),
    gpa_point: decimal(9.99, 2),
    description_khmer: z.string().max(50).nullable(),
  })
  .strict()
  .refine(
    (row) => row.min_percentage <= row.max_percentage,
    "ពិន្ទុអប្បបរមាត្រូវតូចជាង ឬស្មើអតិបរមា",
  );
export type SubjectStandard = z.infer<typeof subjectStandardSchema>;
export type GradingScale = z.infer<typeof gradingScaleSchema>;
export type CurriculumSnapshot = {
  subjects: SubjectStandard[];
  gradingScales: GradingScale[];
  revision: string;
};
export type CurriculumYear = {
  id: string;
  name: string;
  start_date: string;
  status: string;
  is_active: boolean;
};
export const revisionSchema = z.string().regex(/^[a-f0-9]{32}$/);
export const saveCurriculumSchema = z
  .object({
    academicYearId: z.uuid(),
    expectedRevision: revisionSchema,
    subjects: z.array(subjectStandardSchema).max(1000),
    gradingScales: z.array(gradingScaleSchema).max(30),
    deleteSubjectIds: z.array(z.uuid()).max(1000).default([]),
    deleteScaleIds: z.array(z.uuid()).max(30).default([]),
    confirmDelete: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>(),
      ids = new Set<string>();
    value.subjects.forEach((row, i) => {
      const key = `${row.grade_level}:${row.stream_type}:${row.subject_name.toLowerCase()}`;
      if (seen.has(key) || (row.id && ids.has(row.id)))
        ctx.addIssue({
          code: "custom",
          path: ["subjects", i],
          message: "មុខវិជ្ជា ថ្នាក់ និងកម្មវិធីស្ទួនគ្នា",
        });
      seen.add(key);
      if (row.id) ids.add(row.id);
      if (row.id && value.deleteSubjectIds.includes(row.id))
        ctx.addIssue({
          code: "custom",
          message: "មិនអាចរក្សាទុក និងលុបមុខវិជ្ជាដូចគ្នា",
        });
    });
    const letters = new Set<string>(),
      scaleIds = new Set<string>();
    value.gradingScales.forEach((row, i) => {
      if (letters.has(row.grade_letter) || (row.id && scaleIds.has(row.id)))
        ctx.addIssue({
          code: "custom",
          path: ["gradingScales", i],
          message: "និទ្ទេសស្ទួនគ្នា",
        });
      letters.add(row.grade_letter);
      if (row.id) scaleIds.add(row.id);
      if (row.id && value.deleteScaleIds.includes(row.id))
        ctx.addIssue({
          code: "custom",
          message: "និទ្ទេសត្រូវបានស្នើលុបផងដែរ",
        });
      if (
        value.gradingScales.some(
          (other, j) =>
            j < i &&
            row.min_percentage <= other.max_percentage &&
            other.min_percentage <= row.max_percentage,
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["gradingScales", i],
          message: "ចន្លោះពិន្ទុនិទ្ទេសត្រួតគ្នា",
        });
    });
    if (
      (value.deleteSubjectIds.length || value.deleteScaleIds.length) &&
      !value.confirmDelete
    )
      ctx.addIssue({ code: "custom", message: "សូមបញ្ជាក់ការលុបជាមុន" });
  });
export const cloneCurriculumSchema = z
  .object({
    sourceYearId: z.uuid(),
    targetYearId: z.uuid(),
    sourceRevision: revisionSchema,
    targetRevision: revisionSchema,
    replace: z.boolean().default(false),
  })
  .strict()
  .refine(
    (value) => value.sourceYearId !== value.targetYearId,
    "ឆ្នាំប្រភព និងឆ្នាំគោលដៅត្រូវខុសគ្នា",
  );
/** Strip transport-only fields; never interpret a failed/incomplete response as an empty year. */
export function curriculumSnapshot(
  value: CurriculumSnapshot,
): CurriculumSnapshot {
  if (
    !value ||
    !Array.isArray(value.subjects) ||
    !Array.isArray(value.gradingScales)
  )
    throw new Error("ទិន្នន័យកម្មវិធីសិក្សាមិនពេញលេញ");
  return {
    revision: revisionSchema.parse(value.revision),
    subjects: value.subjects.map((row) =>
      subjectStandardSchema.parse({
        id: z.uuid().parse(row.id),
        subject_name: row.subject_name,
        grade_level: row.grade_level,
        stream_type: row.stream_type,
        coefficient: row.coefficient,
        max_score: row.max_score,
        is_core: row.is_core,
      }),
    ),
    gradingScales: value.gradingScales.map((row) =>
      gradingScaleSchema.parse({
        id: z.uuid().parse(row.id),
        grade_letter: row.grade_letter,
        min_percentage: row.min_percentage,
        max_percentage: row.max_percentage,
        gpa_point: row.gpa_point,
        description_khmer: row.description_khmer,
      }),
    ),
  };
}
