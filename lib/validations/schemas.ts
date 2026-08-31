import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'principal', 'teacher', 'monitor']);

export const BaseUserSchema = z.object({
  fullName: z.string().min(1, "សូមបញ្ចូលឈ្មោះពេញ"),
  role: UserRoleSchema.optional().default('teacher'),
  schoolCode: z.string().optional().default('Porieng-2026'),
  phone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
});

export const UserCreateSchema = BaseUserSchema.extend({
  username: z.string()
    .min(3, "ឈ្មោះគណនីត្រូវមានយ៉ាងហោចណាស់ ៣ តួអក្សរ")
    .regex(/^[a-z0-9._]+$/, "ឈ្មោះគណនីត្រូវតែជាអក្សរតូច គ្មានដកឃ្លា (ឧ. run.norak)"),
  password: z.string().min(6, "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ").optional().or(z.literal('')), // Server generates PIN if omitted or empty
  homeroomClassId: z.string().uuid("លេខសម្គាល់ថ្នាក់មិនត្រឹមត្រូវ").optional().nullable(),
});

export const UserUpdateSchema = BaseUserSchema.partial().extend({
  username: z.string().min(3, "ឈ្មោះគណនីត្រូវមានយ៉ាងហោចណាស់ ៣ តួអក្សរ").regex(/^[a-z0-9._]+$/, "ឈ្មោះគណនីត្រូវតែជាអក្សរតូច គ្មានដកឃ្លា (ឧ. run.norak)").optional(),
  password: z.string().min(6, "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ").optional().or(z.literal('')),
  homeroomClassId: z.string().uuid("លេខសម្គាល់ថ្នាក់មិនត្រឹមត្រូវ").optional().nullable(),
});

export const BatchUserSchema = z.object({
  users: z.array(UserCreateSchema).min(1, "សូមផ្តល់បញ្ជីគណនីយ៉ាងហោចណាស់ 1"),
});

export const PromotionSchema = z.object({
  sourceClassId: z.string().uuid("ប្រភពថ្នាក់មិនត្រឹមត្រូវ"),
  targetClassId: z.string().uuid("គោលដៅថ្នាក់មិនត្រឹមត្រូវ"),
  promoteEligibleOnly: z.boolean().default(true),
});

export const AcademicMigrationSchema = z.object({
  sourceYearId: z.string().uuid("ឆ្នាំសិក្សាដើមមិនត្រឹមត្រូវ"),
  targetYearId: z.string().uuid("ឆ្នាំសិក្សាគោលដៅមិនត្រឹមត្រូវ"),
});

export const DocumentUploadSchema = z.object({
  fileName: z.string().min(1, "ឈ្មោះឯកសារមិនអាចទទេបានទេ"),
  fileType: z.string().min(1, "ប្រភេទឯកសារមិនអាចទទេបានទេ"),
  category: z.string().optional().default('upload'),
  classId: z.string().uuid().optional().nullable(),
  scope: z.enum(['personal', 'class', 'student', 'support_case', 'school', 'system_template']).default('class'),
});
