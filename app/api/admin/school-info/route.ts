import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';

export async function GET() {
  const { user, profile, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal') || !profile?.school_id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('schools')
    .select('*')
    .eq('id', profile.school_id)
    .maybeSingle();

  return NextResponse.json({ schoolInfo: data || null });
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

  // Support both camelCase (from old form) and snake_case mapping
  const { error } = await supabase
    .from('schools')
    .update({
      name: schoolInfo.name || schoolInfo.schoolName || '',
      code: schoolInfo.code || schoolInfo.schoolCode || '',
      address: schoolInfo.address || [schoolInfo.village ? `ភូមិ${schoolInfo.village}` : '', schoolInfo.commune ? `ឃុំ${schoolInfo.commune}` : '', schoolInfo.district ? `ស្រុក${schoolInfo.district}` : '', schoolInfo.province ? `ខេត្ត${schoolInfo.province}` : ''].filter(Boolean).join(' '),
      principal_name: schoolInfo.principal_name || schoolInfo.principalName || '',
      principal_phone: schoolInfo.principal_phone || schoolInfo.principalPhone || '',
      ict_lead_name: schoolInfo.ict_lead_name || schoolInfo.ictLeadName || '',
      ict_lead_phone: schoolInfo.ict_lead_phone || schoolInfo.ictLeadPhone || '',
      ict_lead_email: schoolInfo.ict_lead_email || schoolInfo.ictLeadEmail || '',
      smc_head_name: schoolInfo.smc_head_name || schoolInfo.smcHeadName || '',
      smc_head_phone: schoolInfo.smc_head_phone || schoolInfo.smcHeadPhone || '',
      water_supply: schoolInfo.water_supply || schoolInfo.waterSupply || '',
      electricity: schoolInfo.electricity || '',
      internet: schoolInfo.internet || ''
    })
    .eq('id', profile.school_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Log it
  await supabase.from('audit_logs').insert([{
    action: `បានកែសម្រួលព័ត៌មានសាលា និងទិន្នន័យ GEIP`,
    type: 'info',
    user_id: user.id
  }]);

  return NextResponse.json({ success: true });
}
