import { z } from 'zod';
import { PRETEST_SUBJECTS } from './pretest-import';
import type { SubjectPlanTarget } from '@/app/(dashboard)/homeroom/student-study-plans/types';
const months = ['nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug'];
export const STUDY_PLAN_PATHS = ['initial', 'end_plan', 'end_actual', ...months.map(month => `plan.${month}`), ...months.map(month => `actual.${month}`)];
const grade = z.enum(['', 'A', 'B', 'C', 'D', 'E', 'F']);
export const StudyPlanPatchSchema = z.object({
    class_id: z.string().uuid(), academic_year_id: z.string().uuid(),
    patches: z.array(z.object({
        studentId: z.string().uuid(), subjectId: z.enum(PRETEST_SUBJECTS),
        path: z.string().refine(path => STUDY_PLAN_PATHS.includes(path)),
        previousGrade: grade.nullable(), newGrade: grade,
    }).strict()).min(1).max(27600),
}).strict().refine(payload => new Set(payload.patches.map(patch => `${patch.studentId}:${patch.subjectId}:${patch.path}`)).size === payload.patches.length, 'Duplicate grade paths');
export type StudyPlanPatchPayload = z.infer<typeof StudyPlanPatchSchema>;
export type StudyPlansMap = Record<string, Record<string, SubjectPlanTarget>>;
export function readStudyPlanPath(target: SubjectPlanTarget | undefined, path: string): string {
    const [field, month] = path.split('.');
    if (field === 'plan' || field === 'actual')
        return target?.[field]?.[month] || '';
    return target?.[field as 'initial' | 'end_plan' | 'end_actual'] || '';
}
export function buildStudyPlanPatches(original: StudyPlansMap, draft: StudyPlansMap): StudyPlanPatchPayload['patches'] {
    return Object.entries(draft).flatMap(([studentId, targets]) => PRETEST_SUBJECTS.flatMap(subjectId => STUDY_PLAN_PATHS.flatMap(path => {
        const previousGrade = readStudyPlanPath(original[studentId]?.[subjectId], path), newGrade = readStudyPlanPath(targets[subjectId], path);
        return previousGrade === newGrade ? [] : [{ studentId, subjectId, path, previousGrade, newGrade }];
    }))) as StudyPlanPatchPayload['patches'];
}
