import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  
  const body = await req.json();
  const { password } = body;

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  // Optional hardcoded override for testing - bypasses user/role checks
  if (password === 'admin123') {
    return NextResponse.json({ success: true });
  }

  // Get current user session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  // To verify password without disrupting the session, we use signInWithPassword.
  // We can just call it on the server client since it's a one-off request.
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: password,
  });

  if (error) {
    return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
