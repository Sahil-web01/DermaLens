'use client'

import { useState } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { formatDateTime } from '@/lib/utils'
import { notificationsApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  readAt?: string
  createdAt: string
  relatedEntityType: string
  relatedEntityId: string
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.get({ limit: 20 })
      setNotifications(response.notifications || [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsApi.getUnreadCount()
      setUnreadCount(response.count || 0)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await notificationsApi.markRead(notificationIds)
      setNotifications((prev) =>
        prev.map((n) => (notificationIds.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
      toast({ title: 'Error', description: 'Failed to mark as read', variant: 'destructive' })
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast({ title: 'Error', description: 'Failed to mark all as read', variant: 'destructive' })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      markAsRead([notification.id])
    }
    setIsOpen(false)
    // Navigate based on notification type
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <DropdownMenuLabel className="text-lg font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 hover:bg-accent',
                  !notification.readAt && 'bg-accent/50'
                )}
                inset
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', !notification.readAt && 'font-semibold')}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.readAt && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <DropdownMenuSeparator className="mx-2" />
        )}
        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false)
            // Navigate to full notifications page
          }}
          className="px-4 py-2 text-center text-sm text-primary hover:bg-accent"
          inset
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}