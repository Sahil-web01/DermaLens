'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  AlertTriangle,
  Bell,
} from 'lucide-react'

interface SidebarProps {
  navigation: Array<{
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }>
}

export function Sidebar({ navigation }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 flex-shrink-0 border-r border-border bg-card">
      <nav className="flex-1 p-4 space-y-1" aria-label="Sidebar navigation">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  )
}

export function getPatientNavigation() {
  return [
    { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
    { name: 'Check-In', href: '/patient/check-in', icon: ClipboardList },
    { name: 'Timeline', href: '/patient/timeline', icon: Calendar },
  ]
}

export function getClinicianNavigation() {
  return [
    { name: 'Dashboard', href: '/clinician', icon: LayoutDashboard },
    { name: 'Review Queue', href: '/clinician/review', icon: AlertTriangle },
    { name: 'Patients', href: '/clinician/patients', icon: Users },
    { name: 'Recent Check-ins', href: '/clinician/recent-checkins', icon: ClockIcon },
    { name: 'Statistics', href: '/clinician/stats', icon: BarChart3 },
  ]
}

// Need to import ClockIcon
import { Clock } from 'lucide-react'
const ClockIcon = Clock