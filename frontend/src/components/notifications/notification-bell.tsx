'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { cn, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { getBackendAuthHeaders } from '@/lib/backendSession'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface NotificationItem {
  _id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const role = session?.user?.role || 'CLINICIAN'

  const authHeaders = getBackendAuthHeaders(session)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/unread-count?role=${role}`, {
        headers: authHeaders,
      })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count || 0)
      }
    } catch {
      // Background poll failure handled silently
    }
  }, [role, session?.user?.email])

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/notifications?role=${role}`, {
        headers: authHeaders,
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [role, session?.user?.email])

  // Poll for unread count every 15 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 15000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch full list whenever the dropdown is opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-muted focus-ring"
          aria-label={unreadCount > 0 ? `${unreadCount} unread surgical alerts` : 'Notifications'}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[11px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-elevated border-border bg-card" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border p-3.5 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 text-base font-bold text-slate-900 dark:text-slate-100">
              Surgical Alerts
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs font-semibold text-primary hover:text-primary/80"
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-6 text-center text-xs font-medium text-slate-500 dark:text-slate-400">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
              <Check className="mx-auto h-8 w-8 text-emerald-600 mb-2 opacity-80" />
              No unread notifications. All clinical alerts up to date.
            </div>
          ) : (
            notifications.map((item) => {
              const isHighRisk = item.type === 'HIGH_RISK_CHECKIN'

              return (
                <div
                  key={item._id}
                  onClick={() => !item.read && markAsRead(item._id)}
                  className={cn(
                    'p-3.5 transition-colors cursor-pointer flex items-start gap-3',
                    !item.read
                      ? 'bg-sky-50/70 hover:bg-sky-100/70 dark:bg-sky-950/40 dark:hover:bg-sky-900/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isHighRisk ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <Info className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn(
                        'text-xs truncate',
                        !item.read ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'
                      )}>
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-rose-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-normal leading-relaxed line-clamp-3">
                      {item.message}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-border p-2 bg-muted/20 text-center">
          <Link
            href={role === 'CLINICIAN' ? '/clinician' : '/patient/timeline'}
            onClick={() => setIsOpen(false)}
            className="text-xs font-semibold text-primary hover:underline block py-1"
          >
            {role === 'CLINICIAN' ? 'Open Triage Review Queue' : 'Open Recovery Timeline'}
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}