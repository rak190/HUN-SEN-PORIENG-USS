import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';

export async function GET() {
  const { user, profile, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal') || !profile?.school_id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', profile.school_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ schoolInfo: null });
  }

  // Normalize data with both camelCase and snake_case properties
  // for seamless compatibility across /admin/school-info, /principal/settings, and reports
  const normalized = {
    ...data,
    schoolName: data.name || '',
    schoolNameEn: data.name_en || '',
    schoolCode: data.code || '',
    schoolType: data.school_type || '',
    abbreviation: data.abbreviation || '',
    department: data.department || '',
    village: data.village || '',
    commune: data.commune || '',
    district: data.district || '',
    province: data.province || '',
    address: data.address || '',
    principalName: data.principal_name || '',
    principalTitle: data.principal_title || '',
    principalPhone: data.principal_phone || '',
    ictLeadName: data.ict_lead_name || '',
    ictLeadPhone: data.ict_lead_phone || '',
    ictLeadEmail: data.ict_lead_email || data.contact_email || '',
    smcHeadName: data.smc_head_name || '',
    smcHeadPhone: data.smc_head_phone || '',
    waterSupply: data.water_supply || '',
    electricity: data.electricity || '',
    internet: data.internet || '',
  };

  return NextResponse.json({ schoolInfo: normalized });
}

export async function PATCH(req: Request) {
  const { user, profile, role } = await getServerAuth();

  if (!user || role !== 'admin' || !profile?.school_id) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const body = await req.json();
  const { schoolInfo } = body;

  if (!schoolInfo) {
    return NextResponse.json({ error: 'schoolInfo is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Support both camelCase (from form) and snake_case mapping
  const name = schoolInfo.name || schoolInfo.schoolName || '';
  const name_en = schoolInfo.name_en || schoolInfo.schoolNameEn || '';
  const code = schoolInfo.code || schoolInfo.schoolCode || '';
  const school_type = schoolInfo.school_type || schoolInfo.schoolType || '';
  const abbreviation = schoolInfo.abbreviation || '';
  const department = schoolInfo.department || '';
  const village = schoolInfo.village || '';
  const commune = schoolInfo.commune || '';
  const district = schoolInfo.district || '';
  const province = schoolInfo.province || '';
  const address = schoolInfo.address || [village ? `ភូមិ${village}` : '', commune ? `ឃុំ${commune}` : '', district ? `ស្រុក${district}` : '', province ? `ខេត្ត${province}` : ''].filter(Boolean).join(' ');
  const principal_name = schoolInfo.principal_name || schoolInfo.principalName || '';
  const principal_title = schoolInfo.principal_title || schoolInfo.principalTitle || '';
  const principal_phone = schoolInfo.principal_phone || schoolInfo.principalPhone || '';
  const ict_lead_name = schoolInfo.ict_lead_name || schoolInfo.ictLeadName || '';
  const ict_lead_phone = schoolInfo.ict_lead_phone || schoolInfo.ictLeadPhone || '';
  const ict_lead_email = schoolInfo.ict_lead_email || schoolInfo.ictLeadEmail || '';
  const smc_head_name = schoolInfo.smc_head_name || schoolInfo.smcHeadName || '';
  const smc_head_phone = schoolInfo.smc_head_phone || schoolInfo.smcHeadPhone || '';
  const water_supply = schoolInfo.water_supply || schoolInfo.waterSupply || '';
  const electricity = schoolInfo.electricity || '';
  const internet = schoolInfo.internet || '';

  const fullPayload: Record<string, any> = {
    name,
    name_en,
    code,
    school_type,
    abbreviation,
    department,
    village,
    commune,
    district,
    province,
    address,
    principal_name,
    principal_title,
    principal_phone,
    ict_lead_name,
    ict_lead_phone,
    ict_lead_email,
    smc_head_name,
    smc_head_phone,
    water_supply,
    electricity,
    internet,
  };

  // Attempt canonical update
  let updateResult = await supabase
    .from('schools')
    .update(fullPayload)
    .eq('id', profile.school_id);

  // Defensive fallback: If PostgREST returns a schema cache column error (e.g. migration pending on a replica/remote)
  if (updateResult.error && updateResult.error.message?.includes('schema cache')) {
    console.warn('PostgREST schema cache mismatch detected; attempting graceful core update fallback:', updateResult.error.message);
    
    // Core payload of columns guaranteed from initial migrations
    const corePayload: Record<string, any> = {
      name,
      code,
      address,
      principal_name,
      principal_phone,
      ict_lead_name,
      ict_lead_phone,
      contact_email: ict_lead_email,
    };

    updateResult = await supabase
      .from('schools')
      .update(corePayload)
      .eq('id', profile.school_id);
  }

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  }

  // Log to audit_logs
  await supabase.from('audit_logs').insert([{
    action: `បានកែសម្រួលព័ត៌មានសាលា និងទិន្នន័យ GEIP`,
    type: 'info',
    user_id: user.id,
    target_table: 'schools',
    status: 'success',
    details: {
      school_id: profile.school_id,
      name,
      code,
      electricity,
      water_supply,
      internet
    }
  }]);

  return NextResponse.json({ success: true });
}
