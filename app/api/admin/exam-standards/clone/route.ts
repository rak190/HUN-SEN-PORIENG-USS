import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { sourceYearId, targetYearId } = body;

  if (!sourceYearId || !targetYearId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await adminClient.rpc('clone_exam_standards_to_year', {
    p_source_year_id: sourceYearId,
    p_target_year_id: targetYearId
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await adminClient.from('audit_logs').insert([{
    action: `បានចម្លងស្តង់ដារការប្រលងពីឆ្នាំចាស់ទៅឆ្នាំថ្មី`,
    type: 'info',
    user_id: user.id
  }]);

  return NextResponse.json({ success: true, data });
}
