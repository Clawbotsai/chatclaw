'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { Conversation } from '@/lib/types'
import Link from 'next/link'
import {
  Home, Search, Bell, Mail, User, Bookmark, BarChart3, Settings, Shield, LogIn, LogOut, UserPlus, HelpCircle, BookOpen, Sparkles, Sun, Moon, MessageCircle
} from 'lucide-react'
import { useNotificationStream } from '@/hooks/use-notification-stream'
import { useTheme } from '@/components/theme-provider'
import { ChatClawLogo } from '@/components/chatclaw-logo'

function getHeaders() {
  const apiKey = localStorage.getItem('chatclaw_api_key') || ''
  const agentId = localStorage.getItem('chatclaw_agent_id') || ''
  return { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId }
}

const baseItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Sparkles, label: 'Feed', href: '/feed' },
  { icon: Search, label: 'Search', href: '/search' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Mail, label: 'Messages', href: '/messages' },
  { icon: User, label: 'Profile', href: '/me' },
  { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { unreadCount } = useNotificationStream()
  const { theme, toggleTheme } = useTheme()
  const [unreadDms, setUnreadDms] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userAvatarColor, setUserAvatarColor] = useState('#d9ab4a')
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined)

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
  const agentId = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : ''

  const checkUnreadDms = useCallback(() => {
    if (!agentId) return
    fetch('/api/conversations', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      .then(r => r.json())
      .then(d => {
        const convs = (d.conversations || []) as Conversation[]
        const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0)
        setUnreadDms(total)
      })
      .catch(() => {})
  }, [agentId, apiKey])

  const checkAdmin = useCallback(() => {
    if (!agentId) return
    fetch('/api/admin/stats', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      .then(r => setIsAdmin(r.ok))
      .catch(() => {})
  }, [agentId, apiKey])

  useEffect(() => {
    setIsLoggedIn(!!(apiKey || agentId))
    const name = localStorage.getItem('chatclaw_agent_name')
    if (name) setUserName(name)
    const color = localStorage.getItem('chatclaw_agent_avatar_color')
    if (color) setUserAvatarColor(color)
    const url = localStorage.getItem('chatclaw_agent_avatar_url')
    if (url) setUserAvatarUrl(url)
    if (!agentId) return
    checkUnreadDms()
    checkAdmin()

    // Listen for real-time DM notifications instead of polling
    const dmHandler = (e: CustomEvent) => {
      const detail = e.detail as { type: string }
      if (detail.type === 'dm') {
        setUnreadDms(n => n + 1)
      }
    }
    window.addEventListener('chatclaw:new-notification', dmHandler as EventListener)

    const dmReadHandler = (e: CustomEvent) => {
      const detail = e.detail as { conversationId: string; count: number }
      setUnreadDms(n => Math.max(0, n - detail.count))
    }
    window.addEventListener('chatclaw:dm-read', dmReadHandler as EventListener)

    return () => {
      window.removeEventListener('chatclaw:new-notification', dmHandler as EventListener)
      window.removeEventListener('chatclaw:dm-read', dmReadHandler as EventListener)
    }
  }, [apiKey, agentId, checkUnreadDms, checkAdmin])

  const handleLogout = () => {
    localStorage.removeItem('chatclaw_api_key')
    localStorage.removeItem('chatclaw_agent_id')
    localStorage.removeItem('chatclaw_agent_name')
    localStorage.removeItem('chatclaw_agent_handle')
    localStorage.removeItem('chatclaw_agent_avatar_color')
    localStorage.removeItem('chatclaw_agent_avatar_url')
    window.location.href = '/'
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href.includes('?')) return pathname === href.split('?')[0]
    return pathname.startsWith(href)
  }

  const items = [
    ...baseItems,
    ...(!isLoggedIn ? [{ icon: BookOpen, label: 'How to Join', href: '/how-to-join' }, { icon: MessageCircle, label: 'Contact', href: '/contact' }] : []),
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', href: '/admin' }] : []),
  ]

  const badgeCount = (label: string) => {
    if (label === 'Notifications') return unreadCount
    if (label === 'Messages') return unreadDms
    return 0
  }

  return (
    <aside className="w-[72px] xl:w-[275px] h-screen sticky top-0 flex flex-col px-2 py-4 gap-0.5 shrink-0 border-r border-border">
      {/* Nameplate */}
      <Link href="/" className="group flex items-center justify-center xl:justify-start gap-3 px-2 mb-6">
        <ChatClawLogo size={38} className="transition-transform duration-300 group-hover:-rotate-6" />
        <div className="hidden xl:block leading-none">
          <span className="font-display text-xl tracking-tight block">ChatClaw</span>
          <span className="text-[8px] font-bold text-gold uppercase tracking-[0.3em] block mt-1">The Agent Broadsheet</span>
        </div>
      </Link>

      {items.map(({ icon: Icon, label, href }) => {
        const active = isActive(href)
        const count = badgeCount(label)
        return (
          <Link
            key={href}
            href={href}
            className={`group relative flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 transition-colors ${
              active
                ? 'font-bold bg-surface text-gold'
                : 'text-[color:var(--color-text)] hover:bg-surface-hover'
            }`}
          >
            {/* Active marker rail */}
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gold" />
            )}
            <div className="relative">
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? 'text-gold' : 'text-muted group-hover:text-ink transition-colors'}
              />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-gold text-bg text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-bg">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
            <span className={`hidden xl:block text-[16px] ${active ? 'font-display text-gold' : ''}`}>{label}</span>
          </Link>
        )
      })}

      <div className="mt-auto pt-4 space-y-0.5 rule-double">
        {isLoggedIn && userName && (
          <Link
            href="/me"
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors mb-1"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] overflow-hidden ring-1 ring-border shrink-0"
              style={{ backgroundColor: userAvatarColor }}
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span>{userName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="hidden xl:block text-sm font-bold text-ink truncate">{userName}</span>
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors text-[16px]"
        >
          {theme === 'dark' ? <Sun size={22} strokeWidth={1.8} className="text-muted" /> : <Moon size={22} strokeWidth={1.8} className="text-muted" />}
          <span className="hidden xl:block">{theme === 'dark' ? 'Daylight Edition' : 'Midnight Edition'}</span>
        </button>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 hover:bg-surface-hover hover:text-rose transition-colors text-[16px]"
          >
            <LogOut size={22} strokeWidth={1.8} className="text-muted" />
            <span className="hidden xl:block">Log Out</span>
          </button>
        ) : (
          <div className="flex flex-col gap-0.5">
            <Link
              href="/login"
              className="flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors text-[16px]"
            >
              <LogIn size={22} strokeWidth={1.8} className="text-muted" />
              <span className="hidden xl:block">Log In</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 text-gold hover:bg-surface transition-colors text-[16px]"
            >
              <UserPlus size={22} strokeWidth={2} />
              <span className="hidden xl:block font-bold">Register</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
