'use client'

import { Suspense, useState, useEffect } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, UserCheck, ArrowRight, ShieldCheck, Stethoscope, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { syncBackendAuthToken } from '@/lib/backendSession'

const demoCredentials = [
  { role: 'Patient', email: 'patient@demo.com', password: 'demo123' },
  { role: 'Clinician (Sarah)', email: 'clinician@demo.com', password: 'demo123' },
  { role: 'Clinician (James)', email: 'clinician2@demo.com', password: 'demo123' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const initialMode = searchParams?.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode)

  const callbackUrl = searchParams?.get('callbackUrl') || (mode === 'signup' ? '/' : '/')
  const error = searchParams?.get('error')

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [confirmResetPassword, setConfirmResetPassword] = useState('')
  const [role, setRole] = useState<'PATIENT' | 'CLINICIAN'>('PATIENT')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [existingAccountFound, setExistingAccountFound] = useState(false)

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode)
    setFormError('')
    setFormSuccess('')
    setExistingAccountFound(false)
    if (typeof window !== 'undefined' && window.location.search.includes('error=')) {
      window.history.replaceState(null, '', window.location.pathname + (newMode !== 'signin' ? `?mode=${newMode}` : ''))
    }
  }

  // Update mode if URL query param changes
  useEffect(() => {
    if (searchParams?.get('mode') === 'signup') {
      switchMode('signup')
    } else if (searchParams?.get('mode') === 'reset') {
      switchMode('reset')
    }
  }, [searchParams])

  // If already authenticated, allow instant dashboard navigation
  if (status === 'authenticated' && session?.user) {
    const dashboardHref = session.user.role === 'CLINICIAN' ? '/clinician' : '/patient'
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/30">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-card text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">You are already signed in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Logged in as <strong className="text-foreground">{session.user.name || session.user.email}</strong> (
              <span className="capitalize">{session.user.role.toLowerCase()}</span>)
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link href={dashboardHref} className="block w-full">
              <Button className="w-full gap-2 font-semibold" size="lg">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Sign out &amp; switch account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Handle Login submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setFormError('Invalid email or password. If you do not have an account, click "Create Account" above.')
      } else {
        await syncBackendAuthToken(email.trim().toLowerCase(), password)
        // Fetch session to determine role accurately
        const sessionRes = await fetch('/api/auth/session').catch(() => null)
        const sessionData = sessionRes?.ok ? await sessionRes.json().catch(() => null) : null
        const userRole = sessionData?.user?.role

        let targetUrl = callbackUrl && callbackUrl !== '/' && callbackUrl !== '/login' && callbackUrl !== '/signup'
          ? callbackUrl
          : (userRole === 'CLINICIAN' || email.includes('clinician') ? '/clinician' : '/patient')

        // Full location navigation ensures fresh cookies, session hydration, and zero stale cache
        window.location.href = targetUrl
      }
    } catch {
      setFormError('Something went wrong during sign in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Sign Up (Registration) submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!name.trim()) {
      setFormError('Please enter your full name.')
      return
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)

    try {
      // 1. Call Register API
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.alreadyExists) {
          setExistingAccountFound(true)
          setFormError('An account with this email already exists. Click "Sign In with this password" or "Set this password & Sign In" below.')
        } else {
          setFormError(data.error || 'Failed to create account.')
        }
        setIsLoading(false)
        return
      }

      setFormSuccess('Account ready! Signing you in...')

      // 2. Automatically log the new user in
      const signInResult = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Fallback: switch to signin tab with filled email
        switchMode('signin')
        setFormSuccess('Account recognized. Please enter your password to sign in.')
      } else {
        await syncBackendAuthToken(email.trim().toLowerCase(), password)
        const dest = role === 'CLINICIAN' ? '/clinician' : '/patient'
        window.location.href = dest
      }
    } catch {
      setFormError('Network error during registration. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Reset Password submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setFormError('Please enter your account email address.')
      return
    }

    if (resetPassword.length < 6) {
      setFormError('New password must be at least 6 characters.')
      return
    }

    if (resetPassword !== confirmResetPassword) {
      setFormError('Passwords do not match. Please re-enter.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          newPassword: resetPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to reset password.')
        setIsLoading(false)
        return
      }

      setFormSuccess('Password reset successfully! Signing you in...')

      // Automatically sign in with new credentials
      const signInResult = await signIn('credentials', {
        email: cleanEmail,
        password: resetPassword,
        redirect: false,
      })

      if (signInResult?.error) {
        switchMode('signin')
        setPassword(resetPassword)
        setFormSuccess('Password reset! Please click Sign In with your new password below.')
      } else {
        await syncBackendAuthToken(cleanEmail, resetPassword)
        const sessionRes = await fetch('/api/auth/session').catch(() => null)
        const sessionData = sessionRes?.ok ? await sessionRes.json().catch(() => null) : null
        const userRole = sessionData?.user?.role

        const dest = callbackUrl && callbackUrl !== '/' && callbackUrl !== '/login' && callbackUrl !== '/signup'
          ? callbackUrl
          : (userRole === 'CLINICIAN' || cleanEmail.includes('clinician') ? '/clinician' : '/patient')
        window.location.href = dest
      }
    } catch {
      setFormError('Network error during password reset. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoClick = (cred: typeof demoCredentials[0]) => {
    switchMode('signin')
    setEmail(cred.email)
    setPassword(cred.password)
    setFormError('')
  }

  const urlSigninError = mode === 'signin' && error ? 'Invalid email or password. Please verify your credentials or click "Create Account" below.' : ''
  const displayError = formError || urlSigninError

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/30">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className="text-2xl font-bold text-foreground">DermaLens AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'reset'
              ? 'Reset your password'
              : mode === 'signin'
              ? 'Sign in to your account'
              : 'Create a new account'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'reset'
              ? 'Set a new password to update your credentials and access your dashboard'
              : mode === 'signin'
              ? 'Access your surgical recovery & triage dashboard'
              : 'Join the post-operative surveillance care network'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card space-y-6">
          {/* Tab Switcher (Sign In vs Create Account) */}
          <div className="grid grid-cols-2 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={cn(
                'py-2 text-sm font-semibold rounded-lg transition-all',
                mode === 'signin' || mode === 'reset'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mode === 'reset' ? 'Reset Password' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={cn(
                'py-2 text-sm font-semibold rounded-lg transition-all',
                mode === 'signup'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Messages */}
          {displayError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 space-y-2.5" role="alert">
              <div>{displayError}</div>
              {existingAccountFound && (
                <div className="pt-2 border-t border-rose-200 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoading(true)
                      setFormError('')
                      const res = await signIn('credentials', {
                        email: email.trim().toLowerCase(),
                        password,
                        redirect: false,
                      })
                      if (res?.error) {
                        setFormError('Invalid password for this account. Click "Set this password & Sign In" below to update it.')
                        setIsLoading(false)
                      } else {
                        await syncBackendAuthToken(email.trim().toLowerCase(), password)
                        window.location.href = role === 'CLINICIAN' ? '/clinician' : '/patient'
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white font-medium text-[11px] transition-colors"
                  >
                    Sign In with this password
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoading(true)
                      setFormError('')
                      try {
                        const resetRes = await fetch('/api/auth/reset-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword: password }),
                        })
                        if (resetRes.ok) {
                          setFormSuccess('Password updated! Signing in...')
                          const sRes = await signIn('credentials', {
                            email: email.trim().toLowerCase(),
                            password,
                            redirect: false,
                          })
                          if (!sRes?.error) {
                            await syncBackendAuthToken(email.trim().toLowerCase(), password)
                            window.location.href = role === 'CLINICIAN' ? '/clinician' : '/patient'
                            return
                          }
                        }
                        switchMode('signin')
                      } catch {
                        setFormError('Failed to synchronize password.')
                      } finally {
                        setIsLoading(false)
                      }
                    }}
                    className="px-2.5 py-1 rounded border border-rose-300 text-rose-900 bg-white hover:bg-rose-50 font-medium text-[11px] transition-colors"
                  >
                    Set this password &amp; Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {formSuccess && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800" role="alert">
              {formSuccess}
            </div>
          )}

          {/* ===================== RESET PASSWORD FORM ===================== */}
          {mode === 'reset' ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary/90 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <div>
                  <div className="font-semibold text-foreground">Reset &amp; Synchronize Password</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Enter your email address and new password below to instantly update your account across both databases and sign in.
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-foreground mb-1.5">
                  Account Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="sahil@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={cn(
                    'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm',
                    'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                  )}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="reset-password-input" className="block text-xs font-semibold text-foreground mb-1.5">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    id="reset-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={cn(
                      'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm pr-10',
                      'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm-input" className="block text-xs font-semibold text-foreground mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm-input"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={cn(
                    'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm',
                    'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                  )}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full font-semibold py-2.5" size="lg">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Resetting &amp; Signing In...
                  </span>
                ) : (
                  'Reset Password & Sign In'
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  &larr; Back to Sign In
                </button>
              </div>
            </form>
          ) : mode === 'signin' ? (
            /* ===================== SIGN IN FORM ===================== */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={cn(
                    'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm',
                    'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                  )}
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      switchMode('reset')
                      setResetPassword('')
                      setConfirmResetPassword('')
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={cn(
                      'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm pr-10',
                      'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full font-semibold py-2.5" size="lg">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center pt-2">
                <span className="text-xs text-muted-foreground">Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Create one now
                </button>
              </div>

              {/* Demo Credentials Helper */}
              <div className="pt-4 border-t border-border space-y-2">
                <p className="text-[11px] font-semibold text-center text-muted-foreground uppercase tracking-wider">
                  Or Test With Demo Credentials
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {demoCredentials.map((cred) => (
                    <button
                      key={cred.role}
                      type="button"
                      onClick={() => handleDemoClick(cred)}
                      className="p-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs text-left transition-colors"
                    >
                      <div className="font-semibold text-foreground">{cred.role}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{cred.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* ===================== SIGN UP FORM ===================== */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Sahil Dhanjal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className={cn(
                    'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm',
                    'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                  )}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="sahil@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={cn(
                    'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm',
                    'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                  )}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-semibold text-foreground mb-1.5">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={cn(
                      'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm pr-10',
                      'placeholder:text-muted-foreground focus-ring transition-colors disabled:opacity-50'
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selector Pills */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('PATIENT')}
                    className={cn(
                      'p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all',
                      role === 'PATIENT'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    )}
                  >
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Patient</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Post-op recovery tracking
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('CLINICIAN')}
                    className={cn(
                      'p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all',
                      role === 'CLINICIAN'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    )}
                  >
                    <Stethoscope className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Clinician</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Surgical triage &amp; review
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full font-semibold py-2.5" size="lg">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                  </span>
                ) : (
                  'Create Account & Sign In'
                )}
              </Button>

              <div className="text-center pt-2">
                <span className="text-xs text-muted-foreground">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
          Loading authentication...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}