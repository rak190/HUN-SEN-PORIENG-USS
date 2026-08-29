import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth-server';

// Update this version string when you want all clients to force-refresh their caches
export const SYSTEM_VERSION = '2.0.0-hardened';

export async function GET() {
  const { user, profile } = await getServerAuth();
  
  // If the user is logged out, deleted, or disabled, invalidate the session
  if (!user || !profile || profile.is_active === false) {
    return NextResponse.json({ valid: false, version: SYSTEM_VERSION }, { status: 401 });
  }

  return NextResponse.json({ valid: true, version: SYSTEM_VERSION });
}
