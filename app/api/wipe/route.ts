import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key);
  
  const { error } = await supabase.from('system_settings').delete().eq('key', 'certificate_templates');
  
  if (error) {
    return NextResponse.json({ success: false, error });
  }
  return NextResponse.json({ success: true });
}
