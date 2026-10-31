import { randomInt, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UserCreateSchema } from '@/lib/validations/schemas';

/** Auth is external to the profile transaction. Compensate only this request's new UUID. */
export async function provisionSchoolAccount(raw: unknown, admin: SupabaseClient, session: SupabaseClient, schoolId: string, actorRole: string) {
  const input = UserCreateSchema.parse(raw);
  if (actorRole !== 'admin' && (input.role === 'admin' || input.role === 'principal')) throw new Error('មិនមានសិទ្ធិបង្កើតតួនាទីនេះទេ។');
  const requestId = randomUUID(), requestedId = randomUUID();
  const username = input.username.trim().toLowerCase();
  const password = input.password?.trim() || String(randomInt(100000,1000000));
  const { data: existing, error: lookupError } = await admin.from('profiles').select('id').eq('username',username).maybeSingle();
  if (lookupError) throw new Error('មិនអាចផ្ទៀងផ្ទាត់គណនីបានទេ។ សូមសាកម្ដងទៀត។');
  if (existing) throw new Error('ឈ្មោះគណនីមានរួចហើយ។');
  let authId: string = requestedId;
  let created = false;
  const recovery=async(code:string):Promise<never>=>{
    // Auth and audit can both be unavailable. Attempt both independently and always surface the reference.
    const [isolation,audit]=await Promise.allSettled([
      admin.auth.admin.updateUserById(authId,{ban_duration:'876000h'}),
      admin.from('audit_logs').insert({school_id:schoolId,action:'ACCOUNT_CLEANUP_REQUIRED',type:'error',target_table:'profiles',details:{auth_id:authId,request_id:requestId,error_code:code}}),
    ]);
    console.error('[account-provision-recovery]',{requestId,code,isolated:isolation.status==='fulfilled'&&!isolation.value.error,audited:audit.status==='fulfilled'&&!audit.value.error});
    throw new Error(`ការសម្អាតគណនីមិនពេញលេញត្រូវការអ្នកគ្រប់គ្រងពិនិត្យ។ លេខយោង៖ ${requestId}`);
  };
  try {
    const { data, error } = await admin.auth.admin.createUser({ id:requestedId, email:`${username}@kruai.app`,password,email_confirm:true,user_metadata:{full_name:input.fullName.trim()} });
    if (error || !data.user) throw new Error(error?.message?.toLowerCase().includes('password') ? 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។' : 'មិនអាចបង្កើតគណនីបានទេ ឬឈ្មោះគណនីមានរួចហើយ។');
    authId = data.user.id;
    created = true;
    const { data: result, error: profileError } = await session.rpc('provision_school_profile',{p_auth_id:authId,p_input:{username,fullName:input.fullName.trim(),role:input.role,phone:input.phone || null,subject:input.subject || null,monitorClassId:input.monitorClassId || null,previousMonitorId:input.previousMonitorId || null}});
    if (profileError || !result?.success) {
      console.error('[account-provision]',{requestId,code:profileError?.code || 'INVALID_RESPONSE'});
      // A network failure may have lost a successful transaction response. Read before compensating.
      const check = await admin.from('profiles').select('id,school_id,username,role').eq('id',authId).maybeSingle();
      if (check.error) throw new Error('មិនអាចបញ្ជាក់លទ្ធផលបានទេ។ សូមឱ្យអ្នកគ្រប់គ្រងពិនិត្យគណនីមុនសាកម្ដងទៀត។');
      if (!check.data || check.data.school_id !== schoolId || check.data.username !== username || check.data.role !== input.role) {
        throw new Error(profileError?.code === 'PGRST202' || profileError?.code === '23514' ? 'សូមដំឡើង migration Monitor មុនបង្កើតគណនី។' : profileError?.code === '40001' || profileError?.code === '23505' ? 'ការចាត់ថ្នាក់ ឬឈ្មោះគណនីបានផ្លាស់ប្ដូរ។ សូមផ្ទុកបញ្ជីឡើងវិញ។' : 'មិនអាចរក្សាទុកព័ត៌មាន និងការចាត់ថ្នាក់បានទេ។');
      }
    }
    const generatedPassword = input.password?.trim() ? null : password;
    return {id:authId,username,name:input.fullName.trim(),full_name:input.fullName.trim(),role:input.role,school:result?.school || '',status:'សកម្ម',phone:input.phone || '',subject:input.subject || '',created_at:new Date().toISOString(),lastLogin:'មិនធ្លាប់',generatedPassword,tempPassword:generatedPassword};
  } catch (error) {
    // A requested UUID is never an existing user's UUID; this cannot delete an unrelated account.
    const state = await Promise.resolve(admin.from('profiles').select('id').eq('id',authId).maybeSingle()).catch(()=>({data:null,error:{code:'STATE_UNKNOWN'}}));
    if (!state.error && !state.data) {
      const rollback = await admin.auth.admin.deleteUser(authId).catch(()=>({error:{code:'AUTH_DELETE_FAILED'}}));
      if (rollback.error && (created || !['user_not_found','not_found'].includes(rollback.error.code || ''))) {
        return recovery(rollback.error.code || 'AUTH_DELETE_FAILED');
      }
    } else {
      // Unknown state must not be deleted: quarantine instead of destroying a possibly committed profile.
      return recovery('STATE_REQUIRES_REVIEW');
    }
    throw error;
  }
}
