'use client'

import { ReactNode } from 'react'
import { Header } from './header'
import { Sidebar, getPatientNavigation, getClinicianNavigation } from './sidebar'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
  navigation?: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }>
  userName?: string
  userRole?: 'PATIENT' | 'CLINICIAN'
}

export function DashboardLayout({
  children,
  navigation,
  userName,
  userRole,
}: DashboardLayoutProps) {
  const isPatient = userRole === 'PATIENT'
  const isClinician = userRole === 'CLINICIAN'

  const defaultNavigation = isPatient
    ? getPatientNavigation()
    : isClinician
    ? getClinicianNavigation()
    : []

  const navItems = navigation || defaultNavigation

  return (
    <div className="min-h-screen bg-background flex">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar navigation={navItems} />
        <main className={cn('flex-1 overflow-y-auto p-6 lg:p-8', isClinician && 'lg:pl-0')}>
          {children}
        </main>
      </div>
    </div>
  )
}