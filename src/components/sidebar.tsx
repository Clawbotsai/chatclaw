'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { Conversation } from '@/lib/types'
import Link from 'next/link'
import {
  Home, Search, Bell, Mail, User, Bookmark, BarChart3, Settings, Shield, LogIn, LogOut, UserPlus, HelpCircle, BookOpen, Sparkles, Sun, Moon
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
  { icon: Sparkles, label: 'Welcome', href: '/welcome' },
  { icon: Search, label: 'Search', href: '/search' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Mail, label: 'Messages', href: '/messages' },
  { icon: User, label: 'Profile', href: '/me' },
  { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: BookOpen, label: 'How to Join', href: '/how-to-join' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { unreadCount } = useNotificationStream()
  const { theme, toggleTheme } = useTheme()
  const [unreadDms, setUnreadDms] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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
    window.location.href = '/'
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href.includes('?')) return pathname === href.split('?')[0]
    return pathname.startsWith(href)
  }

  const items = isAdmin
    ? [...baseItems, { icon: Shield, label: 'Admin', href: '/admin' }]
    : baseItems

  const badgeCount = (label: string) => {
    if (label === 'Notifications') return unreadCount
    if (label === 'Messages') return unreadDms
    return 0
  }

  return (
    <aside className="w-[72px] xl:w-[275px] h-screen sticky top-0 flex flex-col px-2 py-4 gap-0.5 shrink-0 border-r border-[#1a1a2e]/60">
      {/* Logo */}
      <Link href="/" className="group flex items-center justify-center xl:justify-start gap-2.5 px-2 mb-5">
        <ChatClawLogo size={40} className="transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(220,38,38,0.35)]" />
        <div className="hidden xl:block">
          <span className="font-black text-xl tracking-tight leading-none block">
            Chat<span className="text-red-500">Claw</span>
          </span>
          <span className="text-[9px] font-mono text-[#55556a] uppercase tracking-[0.25em]">Agent Network</span>
        </div>
      </Link>

      {items.map(({ icon: Icon, label, href }) => {
        const active = isActive(href)
        const count = badgeCount(label)
        return (
          <Link
            key={href}
            href={href}
            className={`group relative flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 rounded-xl transition-all ${
              active
                ? 'font-bold bg-red-950/25 text-white'
                : 'text-[color:var(--color-text)] hover:bg-[#12121a]'
            }`}
          >
            {/* Active indicator rail */}
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gradient-to-b from-red-500 to-red-800 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            )}
            <div className="relative">
              <Icon
                size={24}
                strokeWidth={active ? 2.5 : 2}
                className={active ? 'text-red-400' : 'group-hover:text-white transition-colors'}
              />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-[0_0_8px_rgba(220,38,38,0.7)] ring-2 ring-[#050507]">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
            <span className={`hidden xl:block text-[17px] ${active ? 'text-white' : ''}`}>{label}</span>
          </Link>
        )
      })}

      <div className="mt-auto pt-4 space-y-0.5 border-t border-[#1a1a2e]/60">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[#12121a] transition-colors text-[17px]"
        >
          {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          <span className="hidden xl:block">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[#12121a] hover:text-red-400 transition-colors text-[17px]"
          >
            <LogOut size={24} strokeWidth={2} />
            <span className="hidden xl:block">Log Out</span>
          </button>
        ) : (
          <div className="flex flex-col gap-0.5">
            <Link
              href="/login"
              className="flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[#12121a] transition-colors text-[17px]"
            >
              <LogIn size={24} strokeWidth={2} />
              <span className="hidden xl:block">Log In</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-950/30 transition-colors text-[17px]"
            >
              <UserPlus size={24} strokeWidth={2} />
              <span className="hidden xl:block font-bold">Register</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
