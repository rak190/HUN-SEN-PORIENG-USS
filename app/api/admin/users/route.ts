import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { provisionSchoolAccount } from '@/lib/accounts/provision-school-account';
import { toggleStaffStatusAction,resetStaffPasswordAction,updateStaffProfileAction,deleteStaffPermanentlyAction } from '@/app/(dashboard)/admin/teachers/actions';
import { UserRoleSchema } from '@/lib/validations/schemas';

const generatePin = () => crypto.randomInt(100000, 999999).toString();

const getRoleKh = (role: string) => {
  return role === 'principal' ? 'នាយកសាលា' : role === 'admin' ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ' : role === 'monitor' ? 'ប្រធានថ្នាក់' : 'គ្រូបន្ទុកថ្នាក់';
};

export async function GET() {
  const { user, role, profile } = await getServerAuth();

  if (!user || !profile?.is_active || !profile.school_id || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: false, users: [] });
  }

  try {
    let query = adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
      
    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id);
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) throw profileError;

    let authUserMap = new Map<string, any>();
    try {
      const { data: authData } = await adminClient.auth.admin.listUsers();
      if (authData?.users) {
        authUserMap = new Map(authData.users.map(u => [u.id, u]));
      }
    } catch (authErr) {
      console.warn('Failed to fetch auth list, continuing with profiles:', authErr);
    }

    const {data: years,error:yearError}=await adminClient.from('academic_years').select('id').eq('school_id',profile.school_id).eq('is_active',true).eq('status','active');
    if(yearError)throw yearError;
    const {data: monitorClasses,error:assignmentError}=await adminClient.from('classes').select('id,name,monitor_id,academic_year_id').eq('school_id',profile.school_id).eq('is_archived',false).in('academic_year_id',(years||[]).map(y=>y.id));
    if(assignmentError)throw assignmentError;
    const mappedUsers = (profiles || []).map(p => {
      const authUser = authUserMap.get(p.id);
      return {
        id: p.id,
        is_active:p.is_active,
        monitor_classes:(monitorClasses||[]).filter(c=>c.monitor_id===p.id),
        username: p.username || p.full_name,
        name: p.full_name || p.username,
        full_name: p.full_name || p.username,
        role: p.role || 'teacher',
        roleKh: getRoleKh(p.role || 'teacher'),
        school: p.school_code || 'Porieng-2026',
        status: p.is_active === false ? 'បានផ្អាក' : 'សកម្ម',
        lastLogin: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleTimeString() : 'មិនធ្លាប់',
        phone: p.phone || 'គ្មានលេខទូរស័ព្ទ',
        subject: p.subject || 'មិនបញ្ជាក់',
        created_at: p.created_at,
      };
    });

    return NextResponse.json({ isDemo: false, users: mappedUsers, monitorClasses:monitorClasses||[] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const {user,role,profile}=await getServerAuth();
  if(!user || !profile?.is_active || !profile.school_id || !role || !['admin','principal'].includes(role)) return NextResponse.json({error:'មិនមានសិទ្ធិគ្រប់គ្រងគណនីទេ។'},{status:403});
  try {
    const body=await req.json(); const rows=Array.isArray(body.users)?body.users:[body];
    if(!rows.length || rows.length>50)return NextResponse.json({error:'សូមបញ្ចូលពី 1 ដល់ 50 គណនី។'},{status:400});
    const admin=createAdminClient(), session=await createClient(); const users=[], errors=[];
    for(const raw of rows){try{const account=await provisionSchoolAccount(raw,admin,session,profile.school_id,role);users.push({...account,roleKh:getRoleKh(account.role)});}catch(error){errors.push({username:typeof raw?.username==='string'?raw.username:'—',error:error instanceof Error?error.message:'មិនអាចបង្កើតគណនីបានទេ។'});}}
    return NextResponse.json({isDemo:false,users,errors,successCount:users.length,failCount:errors.length});
  }catch{return NextResponse.json({error:'មិនអាចដំណើរការបញ្ជីគណនីបានទេ។'},{status:500});}
}

export async function PATCH(req: Request) {
  const { user, role, profile } = await getServerAuth();

  if (!user || !profile?.is_active || !profile.school_id || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const body = await req.json();
  const { id, action, updates } = body;

  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  try {
    if(role==='admin'){
      if(action==='toggle_status')return NextResponse.json(await toggleStaffStatusAction(id,updates?.status!=='បានផ្អាក'));
      if(action==='reset_password')return NextResponse.json(await resetStaffPasswordAction(id));
      if(action==='update_profile'&&!updates?.username)return NextResponse.json(await updateStaffProfileAction(id,{role:updates?.role,full_name:updates?.name,subject:updates?.subject,phone:updates?.phone}));
    }
    const { data: targetProfile } = await adminClient.from('profiles').select('role, is_active, school_id').eq('id', id).eq('school_id',profile.school_id).single();
    
    if (!targetProfile) return NextResponse.json({error:'គណនីមិនមានក្នុងសាលានេះទេ។'},{status:403});
    if (targetProfile?.role === 'admin' && role !== 'admin') {
      return NextResponse.json({ error: 'Principal cannot modify an admin account.' }, { status: 403 });
    }

    if (action === 'toggle_status') {
      const { status } = updates;
      
    if (targetProfile?.role === 'admin' && status === 'បានផ្អាក') {
        const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
        if (count !== null && count <= 1) {
          return NextResponse.json({ error: 'Cannot suspend the last active admin.' }, { status: 400 });
        }
      }

      try {
        const banDuration = status === 'បានផ្អាក' ? '876000h' : 'none';
        const { error: banErr } = await adminClient.auth.admin.updateUserById(id, { ban_duration: banDuration });
        if (banErr) throw banErr;
        const { error: updErr } = await (await createClient()).from('profiles').update({ is_active: status !== 'បានផ្អាក' }).eq('id', id);
        if (updErr) throw updErr;
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to toggle status' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'reset_password') {
      const newPin = generatePin();
      try {
        const { error: pwdErr } = await adminClient.auth.admin.updateUserById(id, { password: newPin });
        if (pwdErr) throw pwdErr;
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to reset password' }, { status: 500 });
      }
      return NextResponse.json({ success: true, newPassword: newPin });
    }

    if (action === 'update_profile') {
      const { name, role: newRole, username, phone, subject } = updates;
      if(newRole)UserRoleSchema.parse(newRole);
      const profileUpdates: Record<string, unknown> = {};
      
      if (newRole === 'admin' && role !== 'admin') {
        return NextResponse.json({ error: 'Principal cannot assign admin role.' }, { status: 403 });
      }

    if (targetProfile?.role === 'admin' && newRole && newRole !== 'admin') {
        const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
        if (count !== null && count <= 1) {
          return NextResponse.json({ error: 'Cannot demote the last active admin.' }, { status: 400 });
        }
      }
      
      if (name) profileUpdates.full_name = name;
      if (newRole) profileUpdates.role = newRole;
      if (username) profileUpdates.username = username;
      if (phone !== undefined) profileUpdates.phone = phone;
      if (subject !== undefined) profileUpdates.subject = subject;

      try {
        const { error: metaErr } = await adminClient.auth.admin.updateUserById(id, {
          email: username ? `${username.trim().toLowerCase()}@kruai.app` : undefined,
          user_metadata: { full_name: name, role: newRole }
        });
        if (metaErr) throw metaErr;
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to update auth metadata' }, { status: 500 });
      }

      const { error: profileErr } = await (await createClient()).from('profiles').update(profileUpdates).eq('id', id).eq('school_id',profile.school_id);
      if (profileErr) throw profileErr;
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req:Request){
  const id=new URL(req.url).searchParams.get('id');
  if(!id)return NextResponse.json({error:'លេខសម្គាល់គណនីត្រូវបានទាមទារ។'},{status:400});
  try{await deleteStaffPermanentlyAction(id);return NextResponse.json({success:true});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'មិនអាចលុបគណនីបានទេ។'},{status:403});}
}
