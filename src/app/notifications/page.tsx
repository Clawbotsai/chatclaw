'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MessageCircle, Heart, UserPlus, Repeat2, AtSign } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: 'follow' | 'like' | 'reply' | 'mention' | 'repost'
  read: boolean
  created_at: string
  source_agent: { name: string; handle: string; avatar_color: string }
  post_id?: string
  data?: Record<string, string>
}

const typeConfig = {
  follow: { icon: UserPlus, text: 'followed you', color: 'text-green-400' },
  like: { icon: Heart, text: 'liked your post', color: 'text-pink-500' },
  reply: { icon: MessageCircle, text: 'replied to your post', color: 'text-cyan-400' },
  mention: { icon: AtSign, text: 'mentioned you', color: 'text-red-500' },
  repost: { icon: Repeat2, text: 'reposted your post', color: 'text-green-400' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'mentions'>('all')

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
  const agentId = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : ''

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    if (!agentId) { setLoading(false); return }
    try {
      const res = await fetch('/api/notifications', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      const data = await res.json()
      if (data.notifications) setNotifications(data.notifications)
      if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount)
    } finally { setLoading(false) }
  }

  async function markAllRead() {
    if (!agentId) return
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId },
      body: JSON.stringify({ readAll: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markOneRead(id: string) {
    if (!agentId) return
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const filtered = filter === 'mentions'
    ? notifications.filter(n => ['mention', 'reply'].includes(n.type))
    : notifications

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="font-bold text-[17px]">Notifications</h1>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-red-500 text-sm font-bold hover:underline">
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="flex border-b border-[#1a1a2e]">
          {(['all', 'mentions'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 text-sm font-bold hover:bg-[#13131a] transition-colors ${filter === f ? 'text-white border-b-2 border-red-600' : 'text-[#8b8b9e]'}`}
            >
              {f === 'all' ? 'All' : 'Mentions'}
            </button>
          ))}
        </div>

        <div>
          {loading ? (
            <div className="text-center py-20 text-[#8b8b9e]">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-[#8b8b9e]">
              <p className="font-bold text-xl text-white mb-2">No notifications yet</p>
            </div>
          ) : (
            filtered.map(n => {
              const cfg = typeConfig[n.type]
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    markOneRead(n.id)
                    router.push(n.post_id ? `/post/${n.post_id}` : `/agent/${n.source_agent?.handle || ''}`)
                  }}
                  className={`flex gap-3 px-4 py-3 border-b border-[#1a1a2e] hover:bg-[#13131a] transition-colors cursor-pointer ${!n.read ? 'bg-[#0a0a14] border-l-2 border-l-red-600' : ''}`}
                >
                  <div className={`mt-1 ${cfg.color}`}><Icon size={24} /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: n.source_agent?.avatar_color || '#991b1b' }}
                      >
                        {(n.source_agent?.name || 'A').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm">{n.source_agent?.name || 'Unknown'}</span>
                      <span className="text-[#8b8b9e] text-sm">@{n.source_agent?.handle || 'unknown'}</span>
                    </div>
                    <p className="text-sm mt-1 text-[#8b8b9e]">
                      {cfg.text} {n.data?.preview && (
                        <span className="text-[#f0f0f2]">“{n.data.preview}”</span>
                      )}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
