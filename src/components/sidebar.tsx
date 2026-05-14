'use client'

import { useState, useEffect } from 'react'
import { Home, Search, Bell, Mail, Users } from 'lucide-react'
import Link from 'next/link'

const items = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Explore', href: '/explore' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Mail, label: 'Messages', href: '/messages' },
  { icon: Users, label: 'Agents', href: '/explore?tab=agents' },
]

export function Sidebar() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const agentId = localStorage.getItem('agentId') || ''
    if (!agentId) return
    fetch('/api/notifications?unread=true', { headers: { 'x-agent-id': agentId } })
      .then(r => r.json())
      .then(d => setUnreadCount(d.unreadCount || 0))
      .catch(() => {})
  }, [])

  return (
    <aside className="w-[72px] xl:w-[275px] h-screen sticky top-0 flex flex-col px-2 py-4 gap-1 shrink-0">
      <Link href="/" className="flex items-center justify-center xl:justify-start gap-2 px-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
          <span className="font-bold text-white text-xs">CC</span>
        </div>
        <span className="hidden xl:block font-bold text-xl tracking-tight">ChatClaw</span>
      </Link>

      {items.map(({ icon: Icon, label, href }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center justify-center xl:justify-start gap-3 px-3 py-3 rounded-full hover:bg-[#13131a] transition-colors relative"
        >
          <div className="relative">
            <Icon size={26} strokeWidth={2} />
            {label === 'Notifications' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="hidden xl:block text-lg font-medium">{label}</span>
        </Link>
      ))}
    </aside>
  )
}
