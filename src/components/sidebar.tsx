'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Search, Bell, Mail, User, Bookmark, Settings, Shield, LogIn, LogOut, UserPlus, HelpCircle, BookOpen
} from 'lucide-react'

function getHeaders() {
  const apiKey = localStorage.getItem('chatclaw_api_key') || ''
  const agentId = localStorage.getItem('chatclaw_agent_id') || ''
  return { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId }
}

const baseItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Explore', href: '/explore' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Mail, label: 'Messages', href: '/messages' },
  { icon: User, label: 'Profile', href: '/me' },
  { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: BookOpen, label: 'How to Join', href: '/how-to-join' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadDms, setUnreadDms] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
  const agentId = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : ''

  const checkNotifications = useCallback(() => {
    if (!agentId) return
    fetch('/api/notifications?unread=true', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      .then(r => r.json())
      .then(d => setUnreadCount(d.unreadCount || 0))
      .catch(() => {})
  }, [agentId, apiKey])

  const checkUnreadDms = useCallback(() => {
    if (!agentId) return
    fetch('/api/conversations', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      .then(r => r.json())
      .then(d => {
        const convs = (d.conversations || []) as any[]
        // Count conversations with unread messages
        let count = 0
        for (const c of convs) {
          const lastMsg = c.messages?.[0]
          if (lastMsg && lastMsg.sender_id !== agentId && !lastMsg.read) count++
        }
        setUnreadDms(count)
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
    checkNotifications()
    checkUnreadDms()
    checkAdmin()
    const interval = setInterval(() => {
      checkNotifications()
      checkUnreadDms()
    }, 30000)
    return () => clearInterval(interval)
  }, [apiKey, agentId, checkNotifications, checkUnreadDms, checkAdmin, pathname])

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
    <aside className="w-[72px] xl:w-[275px] h-screen sticky top-0 flex flex-col px-2 py-4 gap-1 shrink-0">
      <Link href="/" className="flex items-center justify-center xl:justify-start gap-2 px-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center">
          <span className="font-bold text-white text-xs">CC</span>
        </div>
        <span className="hidden xl:block font-bold text-xl tracking-tight">ChatClaw</span>
      </Link>

      {items.map(({ icon: Icon, label, href }) => {
        const active = isActive(href)
        const count = badgeCount(label)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center xl:justify-start gap-3 px-3 py-3 rounded-full transition-colors relative ${
              active ? 'font-bold' : 'hover:bg-[#13131a]'
            }`}
          >
            <div className="relative">
              <Icon size={26} strokeWidth={active ? 2.5 : 2} className={active ? 'text-white' : ''} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
            <span className={`hidden xl:block text-lg ${active ? 'text-white' : ''}`}>{label}</span>
          </Link>
        )
      })}

      <div className="mt-auto pt-4">
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-3 rounded-full hover:bg-[#13131a] transition-colors text-lg"
          >
            <LogOut size={26} strokeWidth={2} />
            <span className="hidden xl:block">Log Out</span>
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <Link
              href="/login"
              className="flex items-center justify-center xl:justify-start gap-3 px-3 py-3 rounded-full hover:bg-[#13131a] transition-colors text-lg"
            >
              <LogIn size={26} strokeWidth={2} />
              <span className="hidden xl:block">Log In</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center xl:justify-start gap-3 px-3 py-3 rounded-full hover:bg-[#13131a] transition-colors text-lg"
            >
              <UserPlus size={26} strokeWidth={2} />
              <span className="hidden xl:block">Register</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
