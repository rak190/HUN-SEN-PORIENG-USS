'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { z } from 'zod';
import crypto from 'node:crypto';
async function managedStaff(userId:string){
  z.uuid().parse(userId);
  const {user,profile,role}=await getServerAuth();
  if(!user || role!=='admin' || profile?.is_active!==true || !profile.school_id)throw new Error('មិនមានសិទ្ធិគ្រប់គ្រងគណនីទេ។');
  const admin=createAdminClient(),session=await createClient();
  const {data:target,error}=await admin.from('profiles').select('id,role,is_active,school_id').eq('id',userId).eq('school_id',profile.school_id).single();
  if(error||!target)throw new Error('គណនីមិនមានក្នុងសាលានេះទេ។');
  return{user,profile,admin,session,target};
}
export async function toggleStaffStatusAction(userId:string,targetStatus:boolean){
  z.boolean().parse(targetStatus);
  const {user,profile,admin,session,target}=await managedStaff(userId);
  if(user.id===userId)throw new Error('មិនអាចផ្អាកគណនីខ្លួនឯងបានទេ។');
  const {error}=await session.from('profiles').update({is_active:targetStatus}).eq('id',userId).eq('school_id',profile.school_id);
  if(error)throw new Error('មិនអាចកែស្ថានភាពគណនីបានទេ។');
  const auth=await admin.auth.admin.updateUserById(userId,{ban_duration:targetStatus?'none':'876000h'});
  if(auth.error){
    // Compensate the profile update, and report failure instead of a false success.
    const rollback=await session.from('profiles').update({is_active:target.is_active}).eq('id',userId);
    if(rollback.error)throw new Error('គណនីត្រូវការអ្នកគ្រប់គ្រងពិនិត្យស្ថានភាពឡើងវិញ។');
    throw new Error('មិនអាចកែសិទ្ធិចូលប្រើបានទេ។ សូមសាកម្ដងទៀត។');
  }
  await admin.from('audit_logs').insert({user_id:user.id,school_id:profile.school_id,action:'STAFF_STATUS_CHANGED',type:'info',details:{profile_id:userId,is_active:targetStatus}});
  return{success:true};
}
export async function resetStaffPasswordAction(userId:string,explicitPassword?:string){
  const {user,profile,admin}=await managedStaff(userId);
  const newPassword=explicitPassword?z.string().min(6).parse(explicitPassword):crypto.randomBytes(4).toString('hex');
  const {error}=await admin.auth.admin.updateUserById(userId,{password:newPassword});
  if(error)throw new Error('មិនអាចកំណត់ពាក្យសម្ងាត់ថ្មីបានទេ។');
  await admin.from('audit_logs').insert({user_id:user.id,school_id:profile.school_id,action:'STAFF_PASSWORD_RESET',type:'info',details:{profile_id:userId}});
  return{success:true,newPassword};
}
export async function updateStaffProfileAction(userId:string,updates:{role?:string;subject?:string;phone?:string;full_name?:string}){
  const {user,profile,session,admin}=await managedStaff(userId);
  const value=z.object({role:z.enum(['teacher','principal','admin','monitor']).optional(),subject:z.string().max(200).optional(),phone:z.string().max(80).optional(),full_name:z.string().trim().min(1).max(200).optional()}).strict().parse(updates);
  if(user.id===userId&&value.role&&value.role!=='admin')throw new Error('មិនអាចទម្លាក់តួនាទីខ្លួនឯងបានទេ។');
  const {error}=await session.from('profiles').update(value).eq('id',userId).eq('school_id',profile.school_id);
  if(error)throw new Error(error.code==='23514'?'សូមដកការចាត់ថ្នាក់របស់ប្រធានថ្នាក់ជាមុនសិន។':'មិនអាចកែព័ត៌មានគណនីបានទេ។');
  await admin.from('audit_logs').insert({user_id:user.id,school_id:profile.school_id,action:'STAFF_PROFILE_UPDATED',type:'info',details:{profile_id:userId,fields:Object.keys(value)}});
  return{success:true};
}
export async function deleteStaffPermanentlyAction(userId:string){
  const {user,profile,admin,target}=await managedStaff(userId);
  if(user.id===userId)throw new Error('មិនអាចលុបគណនីខ្លួនឯងបានទេ។');
  if(target.role==='admin'){
    const {count,error}=await admin.from('profiles').select('id',{count:'exact',head:true}).eq('school_id',profile.school_id).eq('role','admin').eq('is_active',true);
    if(error || (count||0)<=1)throw new Error('មិនអាចលុបអ្នកគ្រប់គ្រងចុងក្រោយបានទេ។');
  }
  const taught=await admin.from('classes').select('id').eq('teacher_id',userId);
  if(taught.error)throw new Error('មិនអាចផ្ទៀងផ្ទាត់ប្រវត្តិថ្នាក់បានទេ។');
  const classIds=(taught.data||[]).map(c=>c.id);
  const grades=classIds.length?await admin.from('grades').select('id',{count:'exact',head:true}).in('class_id',classIds):{count:0,error:null};
  if(grades.error || (grades.count||0)>0)throw new Error('គណនីនេះមានប្រវត្តិពិន្ទុ។ សូមផ្អាកគណនីជំនួសការលុប។');
  const checks=await Promise.all([
    admin.from('classes').select('id',{count:'exact',head:true}).or(`teacher_id.eq.${userId},monitor_id.eq.${userId}`),
    admin.from('attendance_records').select('id',{count:'exact',head:true}).eq('recorded_by',userId),
    admin.from('grade_snapshots').select('id',{count:'exact',head:true}).eq('created_by',userId),
    admin.from('activity_logs').select('id',{count:'exact',head:true}).eq('created_by',userId),
  ]);
  if(checks.some(check=>check.error))throw new Error('មិនអាចផ្ទៀងផ្ទាត់ប្រវត្តិគណនីបានទេ។');
  if(checks.some(check=>(check.count||0)>0))throw new Error('គណនីនេះមានថ្នាក់ ឬប្រវត្តិទិន្នន័យ។ សូមផ្អាកគណនីជំនួសការលុប។');
  // Auth deletion cascades its profile in one database transaction; never delete the profile first.
  const {error}=await admin.auth.admin.deleteUser(userId);
  if(error)throw new Error('មិនអាចលុបគណនីបានទេ។ ទិន្នន័យនៅរក្សាទុក។');
  await admin.from('audit_logs').insert({user_id:user.id,school_id:profile.school_id,action:'STAFF_ACCOUNT_DELETED',type:'info',details:{profile_id:userId}});
  return{success:true};
}
