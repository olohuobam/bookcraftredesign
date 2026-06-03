'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Bell,
  Book,
  MessageCircle,
  Settings,
  Check,
  CheckCheck,
  Trash2,
  X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'book_ready' | 'comment' | 'system' | 'general'
  data: Record<string, string>
  read: boolean
  created_at: string
}

// ─── Relative Time ────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'gerade eben'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} Min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std`

  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`

  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
  })
}

// ─── Icon for notification type ───────────────────────────────────────────────

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'book_ready':
      return <Book className="w-4 h-4 text-emerald-500" />
    case 'comment':
      return <MessageCircle className="w-4 h-4 text-blue-500" />
    case 'system':
      return <Settings className="w-4 h-4 text-amber-500" />
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationCenter({ placement = 'sidebar' }: { placement?: 'sidebar' | 'topbar' }) {
  const { user, getIdToken } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // ─── Fetch notifications ──────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const token = await getIdToken()
      if (!token) return

      const res = await fetch('/api/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) return

      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch (err) {
      console.error('[NotificationCenter] Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, getIdToken])

  // ─── Initial fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user, fetchNotifications])

  // ─── Supabase Realtime subscription ───────────────────────────────────────

  useEffect(() => {
    if (!user || !supabase) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Notification }) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
          setUnreadCount((prev) => (payload.new.read ? prev : prev + 1))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Notification }) => {
          setNotifications((prev) => {
            const updated = prev.map((n) =>
              n.id === payload.new.id ? (payload.new as Notification) : n,
            )
            setUnreadCount(updated.filter((n) => !n.read).length)
            return updated
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { old: { id: string } }) => {
          setNotifications((prev) => {
            const updated = prev.filter((n) => n.id !== payload.old.id)
            setUnreadCount(updated.filter((n) => !n.read).length)
            return updated
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // ─── Click outside to close ───────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // ─── Mark as read ─────────────────────────────────────────────────────────

  const markAsRead = async (id: string) => {
    const token = await getIdToken()
    if (!token) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error('[NotificationCenter] Mark read error:', err)
      fetchNotifications() // Re-sync on error
    }
  }

  const markAllAsRead = async () => {
    const token = await getIdToken()
    if (!token) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error('[NotificationCenter] Mark all read error:', err)
      fetchNotifications()
    }
  }

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const token = await getIdToken()
    if (!token) return

    const wasUnread = notifications.find((n) => n.id === id && !n.read)

    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error('[NotificationCenter] Delete error:', err)
      fetchNotifications()
    }
  }

  // ─── Handle notification click ────────────────────────────────────────────

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    if (notification.data?.url) {
      setIsOpen(false)
      router.push(notification.data.url)
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen((prev) => !prev)
          if (!isOpen) fetchNotifications()
        }}
        className={cn(
          'relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
          isOpen
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        title={t('notifications')}
      >
        <Bell className="w-5 h-5" strokeWidth={isOpen ? 2.5 : 2} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 w-80 sm:w-96 max-h-[70vh] bg-background border border-border rounded-2xl shadow-xl z-[100] flex flex-col overflow-hidden animate-in fade-in duration-200',
            placement === 'topbar'
              ? 'top-12 slide-in-from-top-2'
              : 'bottom-12 slide-in-from-bottom-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h3 className="font-semibold text-sm">{t('notifications')}</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                  title={t('markAllRead')}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('allReadShort')}</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 rounded-full animate-spin border-2 border-border border-t-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('notificationCenterEmpty')}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {t('notificationCenterEmptyDesc')}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 group relative',
                      !notification.read && 'bg-primary/[0.03]',
                    )}
                  >
                    {/* Unread dot */}
                    <div className="flex-shrink-0 mt-1.5">
                      {!notification.read ? (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-muted flex items-center justify-center mt-0.5">
                      <NotificationIcon type={notification.type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm leading-tight truncate',
                          !notification.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>

                    {/* Actions (visible on hover) */}
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title={t('markAsRead')}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
