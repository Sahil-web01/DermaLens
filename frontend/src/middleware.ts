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

  // 1. Allow all API routes to reach their dedicated endpoint handlers (which handle auth, demo fallbacks, and SQLite self-healing)
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 2. Unauthenticated request protection for pages
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. If logged in and visiting /login, /signup or root, redirect to proper role portal
  if (isLoggedIn && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    if (userRole === 'PATIENT') {
      return NextResponse.redirect(new URL('/patient', req.nextUrl.origin))
    } else if (userRole === 'CLINICIAN') {
      return NextResponse.redirect(new URL('/clinician', req.nextUrl.origin))
    }
  }

  // 4. Role-based page routing: Patients visiting /clinician page redirected to /patient
  if (isLoggedIn && userRole !== 'CLINICIAN' && pathname.startsWith('/clinician')) {
    return NextResponse.redirect(new URL('/patient', req.nextUrl.origin))
  }

  // 5. Role-based page routing: Clinicians visiting personal /patient check-in redirected to /clinician
  if (isLoggedIn && userRole !== 'PATIENT' && (pathname === '/patient' || pathname.startsWith('/patient/check-in'))) {
    return NextResponse.redirect(new URL('/clinician', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)'],
}
