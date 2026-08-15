import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // If not configured, just return next. 
    // This allows the demo mode to keep working until properly connected.
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname;

  // Protect Dashboard Routes
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/principal') || pathname.startsWith('/homeroom');

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isProtectedRoute) {
    const role = user.user_metadata?.role;
    
    // RBAC: Admin only routes
    if (pathname.startsWith('/admin') && role !== 'admin') {
      const redirectPath = role === 'principal' ? '/principal' : '/homeroom';
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    
    // RBAC: Principal routes (Admin can also view)
    if (pathname.startsWith('/principal') && role !== 'principal' && role !== 'admin') {
      return NextResponse.redirect(new URL('/homeroom', request.url));
    }

    // RBAC: Homeroom routes
    if (pathname.startsWith('/homeroom') && role !== 'teacher' && role !== 'admin' && role !== 'principal') {
       // If no valid role is found, send back to login
       if (!role) {
         return NextResponse.redirect(new URL('/login', request.url));
       }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
