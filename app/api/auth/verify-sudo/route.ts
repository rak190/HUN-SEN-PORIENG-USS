import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';

export async function POST(req: Request) {
  const body = await req.json();
  const { password } = body;

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser && authUser.email) {
    const { error } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: password,
    });

    if (error) {
      return NextResponse.json({ success: false, message: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ (Incorrect password)' }, { status: 401 });
    }
  } else {
    // Check against explicitly configured sudo password in environment (fail closed if unset)
    const adminSudo = process.env.ADMIN_SUDO_PASSWORD;
    if (!adminSudo || password !== adminSudo) {
      return NextResponse.json({ success: false, message: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ (Incorrect password)' }, { status: 401 });
    }
  }

  return NextResponse.json({ success: true });
}
