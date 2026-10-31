'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import type { AttendanceWorkspace } from '@/lib/attendance/types';
const date=z.iso.date();
const row=z.object({student_id:z.uuid(),status:z.enum(['present','absent','late','permission','P','A','L','E','unexcused','excused']),root_cause:z.string().max(500).nullable().optional(),previous_updated_at:z.iso.datetime({offset:true}).nullable().optional()}).strict();
const batch=z.object({class_id:z.uuid(),academic_year_id:z.uuid().nullable().optional(),date,records:z.array(row).min(1).max(120)}).strict().refine(value=>new Set(value.records.map(record=>record.student_id)).size===value.records.length,'សិស្សស្ទួនក្នុងបញ្ជី។');
export type BatchAttendancePayload=z.infer<typeof batch>;
export type SubmitMonitorAttendancePayload=BatchAttendancePayload;
export async function loadAttendanceWorkspaceAction(input:{class_id:string;academic_year_id:string;date:string}):Promise<{success:boolean;workspace?:AttendanceWorkspace;error?:string}> {
  try {
    const value=z.object({class_id:z.uuid(),academic_year_id:z.uuid(),date}).strict().parse(input);
    const {user,profile,role}=await getServerAuth();
    if(!user || !profile?.is_active || !profile.school_id || !role || !['monitor','teacher','principal','admin'].includes(role))return{success:false,error:'មិនមានសិទ្ធិមើលវត្តមានទេ។'};
    const db=await createClient();
    const {data,error}=await db.rpc('attendance_workspace',{p_class_id:value.class_id,p_year_id:value.academic_year_id,p_date:value.date});
    if(error) return {success:false,error:error.code==='PGRST202'?'សូមដំឡើង migration Monitor ជាមុនសិន។':'មិនអាចផ្ទុកបញ្ជីវត្តមានបានទេ។ សូមពិនិត្យថ្នាក់ និងឆ្នាំសិក្សា។'};
    if(!data || !Array.isArray(data.students) || !Array.isArray(data.records) || !Array.isArray(data.missingDays))return{success:false,error:'លទ្ធផលវត្តមានមិនត្រឹមត្រូវ។ សូមសាកម្ដងទៀត។'};
    return{success:true,workspace:data as AttendanceWorkspace};
  }catch{return{success:false,error:'មិនអាចភ្ជាប់បណ្ដាញ ឬកាលបរិច្ឆេទមិនត្រឹមត្រូវ។ សូមសាកម្ដងទៀត។'};}
}
export async function saveAttendanceBatchAction(payload:BatchAttendancePayload):Promise<{success:boolean;count?:number;workspace?:AttendanceWorkspace;error?:string;conflict?:boolean}> {
  try {
    const value=batch.parse(payload),{user,profile,role}=await getServerAuth();
    if(!user || !profile?.is_active || !profile.school_id || !role || !['monitor','teacher','principal','admin'].includes(role))return{success:false,error:'មិនមានសិទ្ធិកត់ត្រាវត្តមានទេ។'};
    const db=await createClient();
    let year=value.academic_year_id;
    if(!year){const {data,error}=await db.from('classes').select('academic_year_id').eq('id',value.class_id).single();if(error || !data?.academic_year_id)return{success:false,error:'រកមិនឃើញឆ្នាំសិក្សាថ្នាក់នេះទេ។'};year=data.academic_year_id;}
    const {data,error}=await db.rpc('save_class_attendance',{p_class_id:value.class_id,p_year_id:year,p_date:value.date,p_records:value.records});
    if(error)return{success:false,conflict:error.code==='40001',error:error.code==='40001'?'មានអ្នកផ្សេងកែវត្តមាន។ ទិន្នន័យព្រាងនៅរក្សាទុក។ សូមផ្ទុកទិន្នន័យថ្មី ហើយពិនិត្យមុនកែម្ដងទៀត។':error.code==='PGRST202'?'សូមដំឡើង migration Monitor ជាមុនសិន។':error.code==='22023'?'សូមពិនិត្យកាលបរិច្ឆេទ ឆ្នាំសិក្សា និងស្ថានភាពវត្តមាន។':error.code==='42501'?'មិនមានសិទ្ធិចំពោះថ្នាក់ ឬសិស្សនេះទេ។ សូមផ្ទុកបញ្ជីឡើងវិញ។':'មិនអាចរក្សាទុកវត្តមានបានទេ។ ទិន្នន័យព្រាងនៅរក្សាទុក។'};
    if(!data?.success || !data.workspace)return{success:false,error:'មិនអាចបញ្ជាក់ការរក្សាទុកបានទេ។ សូមសាកម្ដងទៀត។'};
    for(const path of ['/monitor/attendance','/monitor/missing','/attendance','/homeroom','/admin/attendance','/admin'])revalidatePath(path);
    return{success:true,count:data.count,workspace:data.workspace as AttendanceWorkspace};
  }catch{return{success:false,error:'មានបញ្ហាបណ្ដាញ ឬទិន្នន័យមិនត្រឹមត្រូវ។ ទិន្នន័យព្រាងនៅរក្សាទុក។'};}
}
export async function submitMonitorAttendanceAction(payload:SubmitMonitorAttendancePayload){return saveAttendanceBatchAction(payload);}
export async function saveAttendanceSingleAction(payload:Omit<BatchAttendancePayload,'records'>&z.infer<typeof row>){
  const {class_id,academic_year_id,date,...record}=payload;
  return saveAttendanceBatchAction({class_id,academic_year_id,date,records:[record]});
}
