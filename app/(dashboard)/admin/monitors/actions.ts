'use server';
import { z } from 'zod';
import { getServerAuth } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
const input = z.object({classId:z.uuid(),yearId:z.uuid(),monitorId:z.uuid().nullable(),previousMonitorId:z.uuid().nullable(),previousClassId:z.uuid().nullable()}).strict();
export async function assignClassMonitorAction(raw:z.infer<typeof input>) {
  const {user,profile,role}=await getServerAuth();
  if(!user || !profile?.is_active || !profile.school_id || !role || !['admin','principal'].includes(role)) throw new Error('មិនមានសិទ្ធិចាត់ប្រធានថ្នាក់ទេ។');
  const value=input.parse(raw), db=await createClient();
  const {data,error}=await db.rpc('assign_class_monitor',{p_class_id:value.classId,p_year_id:value.yearId,p_monitor_id:value.monitorId,p_previous_monitor_id:value.previousMonitorId,p_previous_class_id:value.previousClassId});
  if(error || !data?.success) throw new Error(error?.code==='40001' || error?.code==='23505' ? 'ការចាត់ថ្នាក់បានផ្លាស់ប្ដូរ។ សូមផ្ទុកបញ្ជីឡើងវិញ ហើយពិនិត្យមុនសាកម្ដងទៀត។' : error?.code==='PGRST202' ? 'សូមដំឡើង migration Monitor ជាមុនសិន។' : 'មិនអាចចាត់ប្រធានថ្នាក់បានទេ។ សូមពិនិត្យសាលា ឆ្នាំសិក្សា និងស្ថានភាពគណនី។');
  for(const path of ['/admin/teachers','/admin/classes','/monitor/attendance','/monitor/missing'])revalidatePath(path);
  return {success:true};
}
