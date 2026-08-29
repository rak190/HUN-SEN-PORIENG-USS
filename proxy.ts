import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: any = null;
  let effectiveRole = 'teacher';

  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      user = data.user;
      
      // Fetch authoritative role from DB instead of trusting cookies or metadata
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profile?.role) {
        effectiveRole = profile.role;
      }
    }
  } catch (e) {}

  const pathname = request.nextUrl.pathname;

  // List of protected base paths
  const protectedPrefixes = [
    '/homeroom',
    '/students',
    '/attendance',
    '/grades',
    '/health',
    '/report-cards',
    '/student-records',
    '/support',
    '/parents',
    '/reports',
    '/documents',
    '/giep',
    '/classes',
    '/admin',
    '/principal',
    '/monitor',
  ];

  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix));

  // Redirect to login if unauthenticated
  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isProtectedRoute) {
    // RBAC: Admin only routes
    if (pathname.startsWith('/admin') && effectiveRole !== 'admin' && effectiveRole !== 'principal') {
      return NextResponse.redirect(new URL('/homeroom', request.url));
    }

    // RBAC: Principal routes (Admin can also view)
    if (pathname.startsWith('/principal') && effectiveRole !== 'principal' && effectiveRole !== 'admin') {
      return NextResponse.redirect(new URL('/homeroom', request.url));
    }
  }

  // Redirect authenticated user away from /login
  if (user && pathname === '/login') {
    const target = effectiveRole === 'admin' 
      ? '/admin/teachers' 
      : effectiveRole === 'principal' 
      ? '/principal' 
      : effectiveRole === 'monitor'
      ? '/monitor/attendance'
      : '/homeroom';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
