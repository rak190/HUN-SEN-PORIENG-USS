import { z } from 'zod';
import { optionalOfficialId, optionalRegistrationDob } from '@/lib/students/basic-registration';

export const AdminUpdateStudentSchema = z.object({
  studentId: z.string().uuid({ message: 'លេខសម្គាល់សិស្សមិនត្រឹមត្រូវ (Invalid Student UUID)' }),
  full_name: z.string().trim().min(2, { message: 'សូមបញ្ចូលគោត្តនាម និងនាមសិស្សយ៉ាងហោចណាស់ ២ តួអក្សរ' }).max(100),
  student_id_number: optionalOfficialId,
  english_name: z.string().trim().max(100).optional().nullable(),
  gender: z.enum(['M', 'F', 'ប្រុស', 'ស្រី'], { message: 'ភេទត្រូវតែជា ប្រុស ឬ ស្រី (M or F)' }),
  dob: optionalRegistrationDob,
  photo_url: z.string().trim().optional().nullable().or(z.literal('')),
  parent_phone: z.string().trim().max(30).optional().nullable(),
  emergency_contact_phone: z.string().trim().max(30).optional().nullable(),
  father_name: z.string().trim().max(100).optional().nullable(),
  father_job: z.string().trim().max(100).optional().nullable(),
  father_phone: z.string().trim().max(30).optional().nullable(),
  mother_name: z.string().trim().max(100).optional().nullable(),
  mother_job: z.string().trim().max(100).optional().nullable(),
  mother_phone: z.string().trim().max(30).optional().nullable(),
  guardian_name: z.string().trim().max(100).optional().nullable(),
  guardian_job: z.string().trim().max(100).optional().nullable(),
  guardian_phone: z.string().trim().max(30).optional().nullable(),
  current_address: z.string().trim().max(255).optional().nullable(),
  status: z.enum(['new', 'repeater', 'transfer']).optional().nullable(),
  scholarship: z.enum(['yes', 'no']).optional().nullable(),
  id_poor: z.enum(['none', 'level_1', 'level_2']).optional().nullable(),
  orphan: z.enum(['yes', 'no']).optional().nullable(),
  distance_km: z.coerce.number().min(0).max(100).optional().nullable(),
  disability: z.enum(['none', 'mild', 'severe']).optional().nullable(),
  special_needs_status: z.string().trim().max(255).optional().nullable(),
  desk_number: z.string().trim().max(20).optional().nullable(),
  room_number: z.string().trim().max(20).optional().nullable(),
  academic_year_id: z.string().uuid().optional().nullable(),
});

export type AdminUpdateStudentPayload = z.infer<typeof AdminUpdateStudentSchema>;
