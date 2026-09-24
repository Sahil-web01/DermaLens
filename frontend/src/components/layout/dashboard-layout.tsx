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
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 w-full">
        <Sidebar navigation={navItems} />
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}