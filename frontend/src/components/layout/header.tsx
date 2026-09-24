'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LogOut,
  User,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  ClipboardList,
  Calendar,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState } from 'react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Separator } from '@/components/ui/separator'

export function Header() {
  const pathname = usePathname() || '/'
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isPatient = session?.user?.role === 'PATIENT'
  const isClinician = session?.user?.role === 'CLINICIAN'

  const patientNav = [
    { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
    { name: 'Check-In', href: '/patient/check-in', icon: ClipboardList },
    { name: 'Timeline', href: '/patient/timeline', icon: Calendar },
  ]

  const clinicianNav = [
    { name: 'Dashboard', href: '/clinician', icon: LayoutDashboard },
    { name: 'Patients', href: '/clinician/patients', icon: Users },
  ]

  const navigation = isPatient ? patientNav : isClinician ? clinicianNav : []

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2" aria-label="DermaLens AI Home">
              <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="text-xl font-semibold text-foreground hidden sm:block">DermaLens AI</span>
            </Link>

            {/* Desktop Navigation */}
            {session?.user && (
              <div className="hidden md:flex md:gap-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/patient' && item.href !== '/clinician' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Actions */}
            <div className="hidden sm:flex sm:items-center sm:gap-4">
              {status === 'loading' ? (
                <div className="h-8 w-24 rounded bg-muted animate-pulse" />
              ) : session?.user ? (
                <>
                  <NotificationBell />
                  <div className="relative">
                    <button
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
                      aria-expanded={mobileMenuOpen}
                      aria-haspopup="true"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || undefined} alt={session.user.name || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {session.user.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:block font-medium text-foreground">{session.user.name || session.user.email}</span>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {mobileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-card py-1.5 shadow-elevated focus-ring z-50">
                        <div className="px-3.5 py-2.5 border-b border-border">
                          <p className="text-sm font-bold text-foreground truncate">{session.user.name || session.user.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">{session.user.role.toLowerCase()}</p>
                        </div>
                        <Link
                          href={isPatient ? '/patient' : '/clinician'}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                        <button
                          onClick={() => signOut({ callbackUrl: '/login' })}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-sm font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/login?mode=signup">
                    <Button size="sm" className="text-sm font-medium">
                      Create Account
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Bell and Hamburger */}
            <div className="flex items-center gap-1 sm:hidden">
              {session?.user && <NotificationBell />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {session?.user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 mb-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session.user.image || undefined} alt={session.user.name || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {session.user.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{session.user.name || session.user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{session.user.role.toLowerCase()}</p>
                    </div>
                  </div>

                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}

                  <Link
                    href="/settings"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>

                  <Separator className="my-1" />

                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/login?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full justify-center">
                      Create Account
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}