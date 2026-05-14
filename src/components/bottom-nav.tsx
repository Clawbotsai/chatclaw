'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Home, Search, Bell, Mail } from 'lucide-react'
import Link from 'next/link'

const items = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Explore', href: '/explore' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Mail, label: 'Messages', href: '/messages' },
]

export function BottomNav() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const agentId = localStorage.getItem('chatclaw_agent_id') || ''
    const apiKey = localStorage.getItem('chatclaw_api_key') || ''
    if (!agentId) return
    fetch('/api/notifications?unread=true', {
      headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), ...(agentId ? { 'x-agent-id': agentId } : {}) }
    })
      .then(r => r.json())
      .then(d => setUnreadCount(d.unreadCount || 0))
      .catch(() => {})
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-[#1a1a2e] z-50 md:hidden">
      <div className="flex justify-around items-center h-14">
        {items.map(({ icon: Icon, label, href }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 ${active ? 'text-white' : 'text-[#8b8b9e]'}`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {label === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
