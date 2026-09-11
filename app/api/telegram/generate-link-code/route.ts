import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const auth = await getServerAuth();
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const adminClient = createAdminClient();

    // Store it in the user's profile
    const { error } = await adminClient
      .from('profiles')
      .update({ telegram_link_code: code })
      .eq('id', auth.user.id);

    if (error) {
      console.error('Error updating telegram link code:', error);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error('Server error generating telegram link code:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
