import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

  // Allow static files, auth endpoints, and public landing/login/signup pages
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api/auth')

  // 1. Unauthenticated request protection
  if (!isLoggedIn && !isPublicRoute) {
    // Return 401 JSON error for API calls (allow if auth headers are present)
    if (pathname.startsWith('/api')) {
      const hasAuthHeader = req.headers.get('authorization') || req.headers.get('x-clinician-email') || req.headers.get('x-user-email')
      if (hasAuthHeader) {
        return NextResponse.next()
      }
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access this resource.' },
        { status: 401 }
      )
    }

    // Redirect to login page for browser navigation
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. If logged in and visiting /login, /signup or root, redirect to proper role portal
  if (isLoggedIn && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    if (userRole === 'PATIENT') {
      return NextResponse.redirect(new URL('/patient', req.nextUrl.origin))
    } else if (userRole === 'CLINICIAN') {
      return NextResponse.redirect(new URL('/clinician', req.nextUrl.origin))
    }
  }

  // 3. Role-based isolation: Patients cannot access clinician routes or data
  if (isLoggedIn && userRole !== 'CLINICIAN') {
    if (pathname.startsWith('/clinician')) {
      return NextResponse.redirect(new URL('/patient', req.nextUrl.origin))
    }
    if (pathname.startsWith('/api/clinician')) {
      return NextResponse.json(
        { error: 'Forbidden. Clinician privileges required.' },
        { status: 403 }
      )
    }
  }

  // 4. Role-based isolation: Clinicians cannot access personal patient check-in directly,
  // but CAN access the patient recovery timeline scrubber (/patient/timeline)
  if (isLoggedIn && userRole !== 'PATIENT') {
    if (pathname === '/patient' || pathname.startsWith('/patient/check-in')) {
      return NextResponse.redirect(new URL('/clinician', req.nextUrl.origin))
    }
    if (pathname === '/api/patient' || pathname.startsWith('/api/patient/')) {
      return NextResponse.json(
        { error: 'Forbidden. Patient privileges required.' },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)'],
}
