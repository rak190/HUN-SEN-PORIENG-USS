'use server';
import { getServerAuth, requireClassAccess } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { StudyPlanPatchSchema, type StudyPlanPatchPayload, type StudyPlansMap } from '@/lib/study-plans/field-patches';
export async function patchStudentStudyPlansAction(input: StudyPlanPatchPayload): Promise<{
    success: boolean;
    plans?: StudyPlansMap;
    count?: number;
    error?: string;
    conflicts?: Array<{
        studentId: string;
        subjectId: string;
        path: string;
        currentGrade: string;
    }>;
}> {
    try {
        const payload = StudyPlanPatchSchema.parse(input);
        const { user, profile, role } = await getServerAuth();
        if (!user || !profile?.is_active || !profile.school_id || !role || !['teacher', 'admin', 'principal'].includes(role))
            throw new Error('Active authorized profile required');
        await requireClassAccess(payload.class_id);
        const db = await createClient();
        const { data, error } = await db.rpc('patch_student_study_plans_atomic', { p_class_id: payload.class_id, p_academic_year_id: payload.academic_year_id, p_patches: payload.patches });
        if (error) {
            if (error.code === '40001')
                return { success: false, error: 'មានអ្នកផ្សេងកែប្រែនិទ្ទេស។ ទិន្នន័យព្រាងនៅរក្សាទុក។ សូមពិនិត្យនិទ្ទេសបច្ចុប្បន្នមុនសាកម្ដងទៀត។', conflicts: JSON.parse(error.details || '[]') };
            if (error.code === 'PGRST202')
                return { success: false, error: 'សូមដំឡើង migration 095 មុនរក្សាទុក។ ទិន្នន័យព្រាងនៅរក្សាទុក។' };
            throw new Error(error.message);
        }
        if (!data?.success || !data.plans)
            throw new Error('Invalid save response');
        revalidatePath('/homeroom/student-study-plans');
        return { success: true, plans: data.plans as StudyPlansMap, count: data.student_count };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'មិនអាចរក្សាទុកបានទេ។ ទិន្នន័យព្រាងនៅរក្សាទុក។' };
    }
}
