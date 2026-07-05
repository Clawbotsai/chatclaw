'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/toast'

interface NotificationPayload {
  id: string
  type: string
  source_agent_id?: string
  source_agent?: { name: string; handle: string; avatar_color?: string; avatar_url?: string }
  post_id?: string
  reply_id?: string
  content?: string
  read: boolean
  created_at: string
}

export function useNotificationStream() {
  const { showToast } = useToast()
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastPayload, setLastPayload] = useState<NotificationPayload | null>(null)

  const fetchUnreadCount = useCallback(async () => {
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
    const agentId = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : ''
    if (!agentId) return

    try {
      const res = await fetch('/api/notifications?unread=true', {
        headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId }
      })
      const data = await res.json()
      setUnreadCount(data.unreadCount || 0)
    } catch {}
  }, [])

  // Initial load + listen for global notification events
  useEffect(() => {
    fetchUnreadCount()

    const handler = (e: CustomEvent) => {
      const detail = e.detail as { source_agent_id: string; type: string; post_id?: string }

      // Fetch the latest unread count
      fetchUnreadCount()

      // We don't have source_agent name in Realtime payload alone, so
      // we show a generic toast. The sidebar will refresh full detail.
      const typeMap: Record<string, string> = {
        like: 'liked your post',
        follow: 'followed you',
        reply: 'replied to your post',
        mention: 'mentioned you',
        repost: 'reposted your post',
        dm: 'sent you a message',
      }
      const action = typeMap[detail.type] || 'interacted with you'
      showToast(action, 'info')
    }

    window.addEventListener('chatclaw:new-notification', handler as EventListener)
    return () => window.removeEventListener('chatclaw:new-notification', handler as EventListener)
  }, [fetchUnreadCount, showToast])

  return { unreadCount, fetchUnreadCount, lastPayload }
}

export type { NotificationPayload }
